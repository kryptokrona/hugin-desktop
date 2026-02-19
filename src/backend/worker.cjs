const { Crypto } = require('kryptokrona-utils')
const { findShare } = require('hugin-utils')

const crypto = new Crypto()

//Worker isolates PoW hashing from the main process

//Pass PoW logs back to parent if needed
function logPow(event, data) {
    process.send && process.send({ type: 'log', event, data })
}

//Worker-side share search (bounded by max_job_time_ms)
async function pow_find_share(job, start_nonce, options = {}) {
    const hashes_per_second = parseInt(options.hashes_per_second, 10)
    const time_budget_ms = parseInt(options.time_budget_ms, 10)
    const max_job_time_ms = parseInt(options.max_job_time_ms, 10)
    if (time_budget_ms <= 0) {
        let nonce = start_nonce >>> 0
        const chunk_ms = 1000
        const chunk_attempts = Math.max(1, Math.floor(hashes_per_second * (chunk_ms / 1000)))
        const start = Date.now()
        while (true) {
            if (max_job_time_ms > 0 && (Date.now() - start) >= max_job_time_ms) {
                return null
            }
            const share = await findShare({
                job,
                startNonce: nonce,
                hashesPerSecond: hashes_per_second,
                timeBudgetMs: chunk_ms,
                hashFn: (blobHex) => crypto.cn_turtle_lite_slow_hash_v2(blobHex),
                log: (event, data) => logPow(event, data)
            })
            if (share) return share
            nonce = (nonce + chunk_attempts) >>> 0
        }
    }
    return await findShare({
        job,
        startNonce: start_nonce,
        hashesPerSecond: hashes_per_second,
        timeBudgetMs: time_budget_ms,
        hashFn: (blobHex) => crypto.cn_turtle_lite_slow_hash_v2(blobHex),
        log: (event, data) => logPow(event, data)
    })
}

//Worker-side multi-share search (bounded by max_job_time_ms)
async function pow_calculate_shares(job, required_shares = 1, options = {}) {
    if (!job || !job.blob || !job.target) {
        throw new Error('Invalid job data')
    }

    const shares = []
    let nonce = Math.floor(Math.random() * 0xFFFFFFFF)
    const start = Date.now()
    const max_job_time_ms = parseInt(options.max_job_time_ms, 10)
    for (let i = 0; i < required_shares; i++) {
        if (max_job_time_ms > 0 && (Date.now() - start) >= max_job_time_ms) {
            break
        }
        const share = await pow_find_share(job, nonce, options)
        if (share) {
            shares.push(share)
            nonce = parseInt(share.nonce, 16) + 1
        }
    }
    return { job, shares }
}

//IPC request handler
process.on('message', async (msg) => {
    if (!msg || !msg.type || !msg.req_id) return
    const { type, req_id, payload } = msg
    try {
        if (type === 'find_share') {
            const { job, start_nonce, options } = payload || {}
            const result = await pow_find_share(job, start_nonce, options || {})
            process.send && process.send({ type: 'result', req_id, result })
            return
        }
        if (type === 'calculate_shares') {
            const { job, required_shares, options } = payload || {}
            const result = await pow_calculate_shares(job, required_shares, options || {})
            process.send && process.send({ type: 'result', req_id, result })
            return
        }
        process.send && process.send({ type: 'error', req_id, error: 'unknown_request' })
    } catch (e) {
        process.send && process.send({ type: 'error', req_id, error: e && e.message })
    }
})
