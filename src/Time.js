'use strict';

module.exports = (function(){
    var gettime = function() {
        return (new Date).getTime() / 1000.0;
    };
    return {
        time: 0,
        deltaTime: 0,
        init: function() {
            this.time = gettime();
        },
        update: function() {
            var now = gettime();
            this.deltaTime = now - this.time;
            this.time = now;
        }
    };
})();
