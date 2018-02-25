
var anypixel = require('anypixel');
var THREE = require('three');
var Time = require('./Time.js');

document.addEventListener('DOMContentLoaded', function() {
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(90, anypixel.config.width/anypixel.config.height, 0.1, 1000);
    var renderer = new THREE.WebGLRenderer({context: anypixel.canvas.getContext3D()});
    renderer.setSize(anypixel.config.width, anypixel.config.height);
    renderer.setClearColor(0x000000);

    var geometry = new THREE.BoxGeometry(1, 1, 1);
    var material = new THREE.MeshPhongMaterial( { ambient: 0x000000, color: 0xFF0000, specular: 0xFFFFFF, shininess: 0 } );
    var cube = new THREE.Mesh( geometry, material );    
    scene.add( cube );

    var ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add( directionalLight );

    camera.position.set(0,0,2);
    camera.up = new THREE.Vector3(0,1,0);
    camera.lookAt(new THREE.Vector3(0,0,0));

    var update = function () {
        cube.rotation.x += Time.deltaTime;
        cube.rotation.y += Time.deltaTime;
        cube.position.set(Math.sin(Time.time),0,Math.cos(Time.time));
    };

    Time.init();
    var gameloop = function () {
        Time.update();
        update();
        renderer.render(scene, camera);
        window.requestAnimationFrame(gameloop);
    };
	window.requestAnimationFrame(gameloop);
});
