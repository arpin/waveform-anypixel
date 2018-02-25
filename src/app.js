
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
    var camera = new THREE.PerspectiveCamera(90, anypixel.config.width/anypixel.config.height, 0.1, 1000);
    camera.position.set(0,0,2);
    camera.up = new THREE.Vector3(0,1,0);
    camera.lookAt(new THREE.Vector3(0,0,0));

    var geometry = new THREE.BoxGeometry(1, 1, 1);
    var material = new THREE.MeshPhongMaterial( { ambient: 0x000000, color: 0xFF0000, specular: 0xFFFFFF, shininess: 1 } );
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

    // Setup microphone analyser
    var analyser=null, dataArray, bufferLength;
    var lineGeo, lineMat, line;
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

                lineMat = new THREE.LineBasicMaterial( { color: 0x00ff00 } );
                lineGeo = new THREE.Geometry();
                for (let i = 0; i < bufferLength; i++) {
                    lineGeo.vertices.push(new THREE.Vector3(0, 0, 0));
                }
                line = new THREE.Line( lineGeo, lineMat );
                guiScene.add(line);
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
            let WIDTH = anypixel.config.width;
            let HEIGHT = anypixel.config.height;
            analyser.getByteTimeDomainData(dataArray);
            var sliceWidth = WIDTH * 1.0 / bufferLength;
            var x = 0;
            for (var i = 0; i < bufferLength; i++)
            {
                var v = (dataArray[i] - 128.0)/128.0;
                var y = (HEIGHT/2) + (HEIGHT/2) * v * window.appOptions.gain;
                lineGeo.vertices[i].set(x,y,0);
                x += sliceWidth;
                rms += v*v;
            }
            lineGeo.verticesNeedUpdate = true;
            rms = Math.sqrt(rms / bufferLength);
        }

        cube.scale.set(1.0+rms,1.0+rms,1.0+rms); // bounce based on rms

        var newSpeed = 1.0+rms*10;
        if (newSpeed > speed) { // spin faster based on signal rms
            speed = newSpeed;
        }
        else if (speed > 1.0) { // slowly go back to default speed
            speed -= Time.deltaTime;
        }
        cube.rotation.x += Time.deltaTime*speed;
        cube.rotation.y += Time.deltaTime*speed;
        cube.position.set(Math.sin(Time.time),0,Math.cos(Time.time)/2+0.5);
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
