$(document).ready(function() {
    const video = $('#webcam')[0];
    const ctrack = new clm.tracker();
    ctrack.init();
    const overlay = $('#overlay')[0];
    const overlayCC = overlay.getContext('2d');
    // Отслеживание перемещений мыши:
    const mouse = {
        x: 0,
        y: 0,

        handleMouseMove: function(event) {
            // Получим позицию указателя и нормализуем её, приведя к диапазону [-1, 1]
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
        // Возьмём самое свежее изображение глаз и добавим его в набор данных
        tf.tidy(function() {
            const image = getImage();
            const mousePos = tf.tensor1d([mouse.x, mouse.y]).expandDims(0);

            // Решим, в какую выборку (обучающую или контрольную) его добавлять
            const subset = dataset[Math.random() > 0.2 ? 'train' : 'val'];

            if (subset.x == null) {
                // Создадим новые тензоры
                subset.x = tf.keep(image);
                subset.y = tf.keep(mousePos);
            } else {
                // Конкатенируем их с существующими тензорами
                const oldX = subset.x;
                const oldY = subset.y;

                subset.x = tf.keep(oldX.concat(image, 0));
                subset.y = tf.keep(oldY.concat(mousePos, 0));
            }

            // Увеличим счётчик
            subset.n += 1;
        });
    }

    document.onmousemove = mouse.handleMouseMove;

    function trackingLoop() {
        // Проверим, обнаружено ли в видеопотоке лицо,
        // и если это так - начнём его отслеживать.
        requestAnimationFrame(trackingLoop);

        let currentPosition = ctrack.getCurrentPosition();
        overlayCC.clearRect(0, 0, 400, 300);

        if (currentPosition) {
            // Выведем линии, проведённые между контрольными точками
            // на элементе <canvas>, наложенном на элемент <video>
            ctrack.draw(overlay);

            // Получим прямоугольник, ограничивающий глаза, и обведём его
            // красными линиями
            const eyesRect = getEyesRectangle(currentPosition);
            overlayCC.strokeStyle = 'red';
            overlayCC.strokeRect(eyesRect[0], eyesRect[1], eyesRect[2], eyesRect[3]);

            // Видеопоток может иметь особые внутренние параметры,
            // поэтому нам нужны эти константы для перемасштабирования
            // прямоугольника с глазами перед обрезкой
            const resizeFactorX = video.videoWidth / video.width;
            const resizeFactorY = video.videoHeight / video.height;

            // Вырезаем прямоугольник с глазами из видео и выводим его
            // в соответствующем элементе <canvas>
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
        // Захват текущего изображения в виде тензора
        return tf.tidy(function() {
            const image = tf.fromPixels($('#eyes')[0]);
            // Добавление <i><font color="#999999">измерения</font></i>:
            const batchedImage = image.expandDims(0);
            // Нормализация и возврат данных:
            return batchedImage.toFloat().div(tf.scalar(127)).sub(tf.scalar(1));
        });
    }
    $('body').keyup(function(event) {
        // Выполняется при нажатии на клавишу Пробел на клавиатуре
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

        // Два выходных значения x и y
        model.add(tf.layers.dense({
            units: 2,
            activation: 'tanh',
        }));

        // Используем оптимизатор Adam с коэффициентом скорости обучения 0.0005 и с функцией потерь MSE
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

    function moveTarget() {
        if (currentModel == null) {
            return;
        }
        tf.tidy(function() {
            const image = getImage();
            const prediction = currentModel.predict(image);

            // Конвертируем нормализованные координаты в позицию на экране
            const targetWidth = $('#target').outerWidth();
            const targetHeight = $('#target').outerHeight();
            const x = (prediction.get(0, 0) + 1) / 2 * ($(window).width() - targetWidth);
            const y = (prediction.get(0, 1) + 1) / 2 * ($(window).height() - targetHeight);

            // Переместим в нужное место кружок:
            const $target = $('#target');
            $target.css('left', x + 'px');
            $target.css('top', y + 'px');
        });
    }

    setInterval(moveTarget, 100);

    navigator.mediaDevices.getUserMedia({ video: true }).then(onStreaming);
});

