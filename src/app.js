
var anypixel = require('anypixel');
var THREE = require('three');
var Time = require('./Time.js');

window.appOptions = {
    gain: 1.0
};

document.addEventListener('DOMContentLoaded', function() {
    var renderer = new THREE.WebGLRenderer({context: anypixel.canvas.getContext3D()});
    renderer.autoClear = false;
    renderer.setSize(anypixel.config.width, anypixel.config.height);
    renderer.setClearColor(0x000000);

    // Rotating cube
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(70, anypixel.config.width/anypixel.config.height, 0.1, 1000);
    camera.position.set(0,0,2.4);
    camera.up = new THREE.Vector3(0,1,0);
    camera.lookAt(new THREE.Vector3(0,0,0));

    var geometry = new THREE.BoxGeometry(1, 1, 1);
    var material = new THREE.MeshPhongMaterial( { color: 0xff0000, specular: 0xFFFFFF, shininess: 1 } );
    var cube = new THREE.Mesh( geometry, material );    
    scene.add( cube );

    var ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    var directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add( directionalLight );

    // Waveform visualization
    var guiScene = new THREE.Scene();
    var guiCamera = new THREE.OrthographicCamera(0, anypixel.config.width, anypixel.config.height, 0, 0, 1000);
    guiCamera.position.set(0,0,500);
    guiCamera.up = new THREE.Vector3(0,1,0);
    guiCamera.lookAt(new THREE.Vector3(0,0,0));
    var analyser=null, dataArray, bufferLength;
    var lineGeo, lineMat, line;

    // Frequency visualization
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
                guiScene.add(line);

                freqAnalyser = audioCtx.createAnalyser();
                freqAnalyser.fftSize = 256;
                freqBufferLength = freqAnalyser.frequencyBinCount;
                fregData = new Uint8Array(freqBufferLength);
                source.connect(freqAnalyser);
                for (let i = 0; i < freqBufferLength; i++) {
                    var mesh = new THREE.Mesh( quadGeo, new THREE.MeshBasicMaterial( { color: 0x0000ff } ));
                    quads.push(mesh);
                    guiScene.add(mesh)
                }
			},
			function (err)
			{
				console.log('getUserMedia error: ' + err);
			}
		);
	}


    var speed = 1.0;
    var update = function () {
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
                quads[i].position.set(x, 0, 100);
                quads[i].scale.set(sliceWidth,Math.max(0.01,height*v),1);
                var hsl = quads[i].material.color.getHSL(); // { h: 0, s: 0, l: 0 }
                quads[i].material.color.setHSL(
                    Math.max(0, Math.min(1, 0.66 + v*0.3)), // from blue to red
                    Math.max(0, Math.min(1, v*2.0)),
                    Math.max(0, Math.min(0.5, v*2.0))
                );
                x += sliceWidth;
            }
        }

        cube.scale.set(1.0+rms,1.0+rms,1.0+rms); // bounce based on rms
        var hsl = cube.material.color.getHSL(); // spin color wheel based on rms
        cube.material.color.setHSL(Math.min(1, rms), hsl.s, hsl.l);

        var newSpeed = 1.0+rms*10;
        if (newSpeed > speed) { // spin faster based on signal rms
            speed = newSpeed;
        }
        else if (speed > 1.0) { // slowly go back to default speed
            speed -= Time.deltaTime;
        }
        cube.rotation.x += Time.deltaTime*speed;
        cube.rotation.y += Time.deltaTime*speed;
        cube.position.set(Math.sin(Time.time)*1.1,0,Math.cos(Time.time)/2+0.5);
        //console.log(rms, speed);
    };

    Time.init();
    var gameloop = function () {
        Time.update();
        update();
        renderer.clear();
        renderer.render(scene, camera);
        renderer.render(guiScene, guiCamera);
        window.requestAnimationFrame(gameloop);
    };
	window.requestAnimationFrame(gameloop);
});
