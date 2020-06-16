$(document).ready(function() {
    var h = window.screen.availHeight/2;
    var w = window.screen.availWidth/2;
    var left;
    var secVar = false;
    var fVAr = false;
    var sprache = false;
    var prev = false;
    const video = $('#webcam')[0];
    const ctrack = new clm.tracker();
    ctrack.init();
    var aud = document.getElementById("sounds");
    var aud1 = document.getElementById("sounds1");
    const overlay = $('#overlay')[0];
    const overlayCC = overlay.getContext('2d');

    const mouse = {
        x: 0,
        y: 0,

        handleMouseMove: function(event) {

            mouse.x = (event.clientX / $(window).width()) * 2 - 1;
            mouse.y = (event.clientY / $(window).height()) * 2 - 1;
        },
    }
    const dataset = {
        train: {
            n: 0,
            x: null,
            y: null,
        },
        val: {
            n: 0,
            x: null,
            y: null,
        },
    }

    function captureExample() {

        tf.tidy(function() {
            const image = getImage();
            const mousePos = tf.tensor1d([mouse.x, mouse.y]).expandDims(0);


            const subset = dataset[Math.random() > 0.2 ? 'train' : 'val'];

            if (subset.x == null) {

                subset.x = tf.keep(image);
                subset.y = tf.keep(mousePos);
            } else {

                const oldX = subset.x;
                const oldY = subset.y;

                subset.x = tf.keep(oldX.concat(image, 0));
                subset.y = tf.keep(oldY.concat(mousePos, 0));
            }


            subset.n += 1;
        });
    }

    document.onmousemove = mouse.handleMouseMove;

    function trackingLoop() {

        requestAnimationFrame(trackingLoop);

        let currentPosition = ctrack.getCurrentPosition();
        overlayCC.clearRect(0, 0, 400, 300);

        if (currentPosition) {

            ctrack.draw(overlay);


            const eyesRect = getEyesRectangle(currentPosition);
            overlayCC.strokeStyle = 'red';
            overlayCC.strokeRect(eyesRect[0], eyesRect[1], eyesRect[2], eyesRect[3]);


            const resizeFactorX = video.videoWidth / video.width;
            const resizeFactorY = video.videoHeight / video.height;


            const eyesCanvas = $('#eyes')[0];
            const eyesCC = eyesCanvas.getContext('2d');

            eyesCC.drawImage(
                video,
                eyesRect[0] * resizeFactorX, eyesRect[1] * resizeFactorY,
                eyesRect[2] * resizeFactorX, eyesRect[3] * resizeFactorY,
                0, 0, eyesCanvas.width, eyesCanvas.height
            );
        }
    }

    function onStreaming(stream) {
        video.srcObject = stream;
        ctrack.start(video);
        trackingLoop();

    }
    function getEyesRectangle(positions) {
        const minX = positions[23][0] - 5;
        const maxX = positions[28][0] + 5;
        const minY = positions[24][1] - 5;
        const maxY = positions[26][1] + 5;

        const width = maxX - minX;
        const height = maxY - minY;

        return [minX, minY, width, height];
    }
    function getImage() {

        return tf.tidy(function() {
            const image = tf.fromPixels($('#eyes')[0]);

            const batchedImage = image.expandDims(0);

            return batchedImage.toFloat().div(tf.scalar(127)).sub(tf.scalar(1));
        });
    }
    $('body').keyup(function(event) {

        if (event.keyCode == 32) {
            captureExample();

            event.preventDefault();
            return false;
        }
    });

    let currentModel;

    function createModel() {
        const model = tf.sequential();

        model.add(tf.layers.conv2d({
            kernelSize: 5,
            filters: 20,
            strides: 1,
            activation: 'relu',
            inputShape: [$('#eyes').height(), $('#eyes').width(), 3],
        }));

        model.add(tf.layers.maxPooling2d({
            poolSize: [2, 2],
            strides: [2, 2],
        }));

        model.add(tf.layers.flatten());

        model.add(tf.layers.dropout(0.2));


        model.add(tf.layers.dense({
            units: 2,
            activation: 'tanh',
        }));


        model.compile({
            optimizer: tf.train.adam(0.0005),
            loss: 'meanSquaredError',
        });

        return model;
    }
    function fitModel() {
        let batchSize = Math.floor(dataset.train.n * 0.1);
        if (batchSize < 4) {
            batchSize = 4;
        } else if (batchSize > 64) {
            batchSize = 64;
        }

        if (currentModel == null) {
            currentModel = createModel();
        }

        currentModel.fit(dataset.train.x, dataset.train.y, {
            batchSize: batchSize,
            epochs: 20,
            shuffle: true,
            validationData: [dataset.val.x, dataset.val.y],
        });
    }

    $('#train').click(function() {
        fitModel();
    });
    $('#test').click(function(){
        sprache = true;
        document.getElementById("webcam").style.visibility = "hidden";
        document.getElementById("train").style.visibility = "hidden";
        document.getElementById("overlay").style.visibility = "hidden";
        document.getElementById("dog").style.visibility = "visible";
        document.getElementById("pig").style.visibility = "visible";
    });


    function curPos(x,y) {
        left = x < w;
        if(left === true && prev===false && sprache === true){
            $('#textOben').html("Left");
            fVAr = true;
            if(secVar === true){
                clearTimeout(timer2);
                secVar = false;
            }
            timer1 = setTimeout(play1,1000);
        }
        else if(left === false && prev===true && sprache === true){
            $('#textOben').html("Right");
            secVar = true;
            if(fVAr === true){
                clearTimeout(timer1);
                fVAr = false;
            }
            timer2 = setTimeout(play2, 1000);

        }
        prev = left;
    }
    function play1() {
        aud.play();
    }
    function play2() {
        aud1.play();
    }

    function moveTarget() {
        if (currentModel == null) {
            return;
        }
        tf.tidy(function() {
            const image = getImage();
            const prediction = currentModel.predict(image);


            const targetWidth = $('#target').outerWidth();
            const targetHeight = $('#target').outerHeight();
            const x = (prediction.get(0, 0) + 1) / 2 * ($(window).width() - targetWidth);
            const y = (prediction.get(0, 1) + 1) / 2 * ($(window).height() - targetHeight);


            const $target = $('#target');
            $target.css('left', x + 'px');
            $target.css('top', y + 'px');
            curPos(x,y);

        });
    }

    setInterval(moveTarget, 100);

    navigator.mediaDevices.getUserMedia({ video: true }).then(onStreaming);
});

