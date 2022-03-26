<script>
    import {fade} from 'svelte/transition'
    import FillButton from "/src/components/buttons/FillButton.svelte";
    import hugin from '/static/hugin.png'
</script>

<div class="wrapper" in:fade>
    <div class="left-wrapper">
        <div class="login-wrapper">
            <h1 class="title">Welcome to Hugin Messenger.</h1>
            <FillButton text="Log in" url="/settings"/>
        </div>
    </div>
    <div class="right-wrapper">
        <div class="circle rgb">
            <img class="hugin" src={hugin} alt="">
        </div>
    </div>
</div>

<style>
	:root {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
			Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
	}

	.wrapper {
        display: flex;
        height: 100vh;
        color: #fff;
	}

    .right-wrapper {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        width: 50%;
        height: 100vh;
    }

    .left-wrapper {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        width: 50%;
        height: 100vh;
    }

    .login-wrapper {

    }

    .title {
        width: 270px;
        margin-top: 0;
        margin-bottom: 30px;
    }

    .circle {
        height: 300px;
        width: 300px;
        border-radius: 50%;
    }

    .hugin {
        height: 300px;
        margin-left: 40px;
    }

    @keyframes rgb {
        0%, 100% {
            background: #5f86f2;
        }
        12.5% {
            background: #a65ff2;
        }
        25% {
            background: #f25fd0;
        }
        37.5% {
            background: #f25f61;
        }
        50% {
            background: #f2cb5f;
        }
        62.5% {
            background: #abf25f;
        }
        75% {
            background: #5ff281;
        }
        87.5% {
            background: #5ff2f0;
        }
    }
    .rgb {

        background: #5f86f2;
        -webkit-animation: rgb 30s ease infinite;
        -moz-animation: rgb 30s ease infinite;
        animation: rgb 30s ease infinite;
    }
</style>
