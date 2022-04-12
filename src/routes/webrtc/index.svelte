<script>
    let stream;

    window.api.receive('get-media', async (audio, contact) => {
        audio === true
        console.log('GET MEDIA', audio, contact)
        stream = await navigator.mediaDevices.getUserMedia({video: false, audio: true})
        console.log(stream)
        gotMedia(audio)
    })

    let video = false
    function gotMedia (stream) {
        console.log('STREAM', stream)
        let extra_class = '';
        if (video) {
            extra_class = ' video'
            var myvideo = document.getElementById('myvideo')
            myvideo.srcObject = stream;

            //myvideo.play();
            console.log('god video here plz stream it in frontend')
        }
        window.api.send('send-media')
    }
</script>

<main>
    <div></div>
    <audio src=""></audio>
    <video src=""></video>
</main>

<style>

    main {
        margin: 0 85px;
    }

</style>