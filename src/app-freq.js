
var anypixel = require('anypixel');
var THREE = require('three');
var Time = require('./Time.js');

window.appOptions = {
    gain: 1.0,
    mode: 3,
    freqColor: 0.34,
    freqHi: {
        enabled: true,
        color: 0x777777,
        cooldown: 1.5,
    },
    autoRotateColor: true,
    rotateColorThisFrame: 0,
};

document.addEventListener('onButtonDown', function(event) {
    let corner = (event.detail.x == 0 || event.detail.x == anypixel.config.width - 1) &&
                (event.detail.y == 0 || event.detail.y == anypixel.config.height - 1);
    let edge = event.detail.x == 0 || event.detail.x == anypixel.config.width - 1 ||
                event.detail.y == 0 || event.detail.y == anypixel.config.height - 1;
    let leftside = (event.detail.x < anypixel.config.width / 2.0);
    if (corner) {
        window.appOptions.mode = (window.appOptions.mode+1) % 4;
        //console.log("Selected mode: ", window.appOptions.mode);
    }
    else if (edge) {
        window.appOptions.autoRotateColor = true;
        //console.log("Auto rotating color enabled");
    }
    else {
        window.appOptions.autoRotateColor = false;
        window.appOptions.rotateColorThisFrame += 1;
        //console.log("Rotate color:", window.appOptions.rotateColorThisFrame);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    var renderer = new THREE.WebGLRenderer({context: anypixel.canvas.getContext3D()});
    renderer.autoClear = false;
    renderer.setSize(anypixel.config.width, anypixel.config.height);
    renderer.setClearColor(0x000000);

    var guiCamera = new THREE.OrthographicCamera(0, anypixel.config.width, anypixel.config.height, 0, 0, 1000);
    guiCamera.position.set(0,0,500);
    guiCamera.up = new THREE.Vector3(0,1,0);
    guiCamera.lookAt(new THREE.Vector3(0,0,0));

    // Waveform visualization
    var waveScene = new THREE.Scene();
    var analyser=null, dataArray, bufferLength;
    var lineGeo, lineMat, line;

    // Frequency visualization
    var freqScene = new THREE.Scene();
    var freqAnalyser, fregData, freqBufferLength;
    var quads = [];
    var quadGeo = new THREE.Geometry();
    quadGeo.vertices.push(new THREE.Vector3(0.0, 0.0, 0.0));
    quadGeo.vertices.push(new THREE.Vector3(1.0, 0.0, 0.0));
    quadGeo.vertices.push(new THREE.Vector3(1.0, 1.0, 0.0));
    quadGeo.vertices.push(new THREE.Vector3(0.0, 1.0, 0.0)); 
    quadGeo.faces.push(new THREE.Face3(0, 1, 2)); 
    quadGeo.faces.push(new THREE.Face3(0, 2, 3));
    quadGeo.computeFaceNormals();

    var freqSceneHi = new THREE.Scene();
    var quadsHi = [];
    var maxHi = [];

    // Setup microphone analyser
	if (navigator.mediaDevices.getUserMedia)
	{
		navigator.mediaDevices.getUserMedia({audio:true}).then(
			function (stream)
			{
                let audioCtx = new(window.AudioContext || webkitAudioContext)();
                console.log("sample rate: " + audioCtx.sampleRate);
                var source = audioCtx.createMediaStreamSource(stream);

                analyser = audioCtx.createAnalyser();
                analyser.fftSize = 2048;
                bufferLength = analyser.frequencyBinCount;
                dataArray = new Uint8Array(bufferLength);
                source.connect(analyser);
                lineMat = new THREE.LineBasicMaterial( { color: 0x00faf6 } );
                lineGeo = new THREE.Geometry();
                for (let i = 0; i < bufferLength; i++) {
                    lineGeo.vertices.push(new THREE.Vector3(0, 0, 0));
                }
                line = new THREE.Line( lineGeo, lineMat );
                waveScene.add(line);

                freqAnalyser = audioCtx.createAnalyser();
                //freqAnalyser.fftSize = 256;
                // Get the closest higher power of two representation of screen width
                var fftsize = Math.pow(2,Math.ceil(Math.log(anypixel.config.width)/Math.log(2)));
                freqAnalyser.fftSize = Math.max(128, fftsize); // too small fft sizes offer little to no value
                console.log("Frequency analyser FFT size: ", freqAnalyser.fftSize);
                freqBufferLength = freqAnalyser.frequencyBinCount;
                fregData = new Uint8Array(freqBufferLength);
                source.connect(freqAnalyser);
                for (let i = 0; i < freqBufferLength; i++) {
                    var mesh = new THREE.Mesh( quadGeo, new THREE.MeshBasicMaterial( { color: 0x0000ff } ));
                    quads.push(mesh);
                    freqScene.add(mesh)

                    mesh = new THREE.Mesh( quadGeo, new THREE.MeshBasicMaterial( { color: window.appOptions.freqHi.color } ));
                    quadsHi.push(mesh);
                    freqSceneHi.add(mesh)
                    maxHi.push({
                        time: 0,
                        value: 0.0
                    });
                }
			},
			function (err)
			{
				console.log('getUserMedia error: ' + err);
			}
		);
	}

    var update = function () {
        for (let i = 0; i < freqBufferLength; i++) {
            if (Time.time > maxHi[i].time) {
                maxHi[i].value = Math.max(0, maxHi[i].value-Time.deltaTime);
            }
        }

        var rms = 0;
        if (analyser) {
            analyser.getByteTimeDomainData(dataArray);
            let width = anypixel.config.width;
            let halfHeight = anypixel.config.height/2.0;
            var sliceWidth = width * 1.0 / bufferLength;
            var x = 0;
            for (var i = 0; i < bufferLength; i++)
            {
                var v = (dataArray[i] - 128.0)/128.0;
                var y = halfHeight + halfHeight * v * window.appOptions.gain; 
                lineGeo.vertices[i].set(x,y,200);
                x += sliceWidth;
                rms += v*v;
            }
            lineGeo.verticesNeedUpdate = true;
            rms = Math.sqrt(rms / bufferLength);

            analyser.getByteFrequencyData(fregData);
            let height = anypixel.config.height;
            sliceWidth = width * 1.0 / freqBufferLength;
            x = 0;
            for (let i = 0; i < freqBufferLength; i++) {
                let v = fregData[i]/255.0;
                if (v > maxHi[i].value) {
                    maxHi[i] = {
                        time: Time.time+window.appOptions.freqHi.cooldown,
                        value: v
                    };
                }
                if (window.appOptions.mode == 3) {
                    quads[i].position.set(x, 0.5*(anypixel.config.height - height*v), 100);
                    quads[i].scale.set(sliceWidth,Math.max(0.01,height*v),1);
                    quadsHi[i].position.set(x, 0.5*(anypixel.config.height - height*maxHi[i].value), 99);
                    quadsHi[i].scale.set(sliceWidth,Math.max(0.01,height*maxHi[i].value),1);
                }
                else {
                    quads[i].position.set(x, 0, 100);
                    quads[i].scale.set(sliceWidth,Math.max(0.01,height*v),1);
                    quadsHi[i].position.set(x, 0, 99);
                    quadsHi[i].scale.set(sliceWidth,Math.max(0.01,height*maxHi[i].value),1);
                }
                var hsl = quads[i].material.color.getHSL(); // { h: 0, s: 0, l: 0 }

                let color = window.appOptions.freqColor - v*0.333; // default 0.33 ==> 0 means green ==> red
                color = color % 1;
                if (color < 0) {
                    color += 1; 
                }
                quads[i].material.color.setHSL(
                    Math.max(0, Math.min(1, color)),
                    Math.max(0.4, Math.min(1, v*2.0)),
                    Math.max(0.2, Math.min(0.5, v*2.0))
                );

                hsl = quadsHi[i].material.color.getHSL();
                quadsHi[i].material.color.setHSL(
                    hsl.h,
                    hsl.s,
                    Math.max(0.1, Math.min(0.5, maxHi[i].value*0.7)) // Dim short peaks
                );

                x += sliceWidth;
            }
        }

        if (window.appOptions.autoRotateColor) {
            window.appOptions.freqColor = (window.appOptions.freqColor + 0.05*Time.deltaTime) % 1;
        }
        if (window.appOptions.rotateColorThisFrame > 0) {
            window.appOptions.freqColor = (window.appOptions.freqColor + Time.deltaTime) % 1;
            window.appOptions.rotateColorThisFrame = 0;
        }
    };

    Time.init();
    var gameloop = function () {
        Time.update();
        update();
        renderer.clear();

        switch (window.appOptions.mode) {
            case 1:
                if (window.appOptions.freqHi.enabled) renderer.render(freqSceneHi, guiCamera);
                renderer.render(freqScene, guiCamera);
                renderer.render(waveScene, guiCamera);
                break;
            case 2:
                renderer.render(waveScene, guiCamera);
                break;
            case 3:
            default:
            case 0:
                if (window.appOptions.freqHi.enabled) renderer.render(freqSceneHi, guiCamera);
                renderer.render(freqScene, guiCamera);
                break;
        }

        window.requestAnimationFrame(gameloop);
    };
	window.requestAnimationFrame(gameloop);
});
