const SOCKET_LIMIT_T = 'limit_s', SOCKET_MSG = 'limit_msg', SOCKET_REDIRECT = 'redirect';
class UserLimit {
    constructor(socket, notifySelector) {
        //this.socket = socket;
        //this.selector = notifySelector;

        socket.on('disconnect', () => {
            $(notifySelector).html('Socket.IO disconnected');
        });
        socket.on(SOCKET_LIMIT_T, (used, limit) => {
            if (limit <= 0)
                $(notifySelector).html('Used time: ' + this.formatTime(used));
            else
                $(notifySelector).html('Used time: ' + this.formatTime(used) + ' Remain: ' + this.formatTime(limit - used));
        });
        socket.on(SOCKET_MSG, (msg) => {
            $(notifySelector).html(msg);
        });
        socket.on(SOCKET_REDIRECT, (path) => {
            window.location.href = path || '/login';
        });
    }
    formatTime(second) {
        let str = ""
        if (second < 0) {
            second *= -1;
            str += '-'
        }
        let t = Math.floor(second / (24 * 3600));
        second -= (24 * 3600 * t);
        if (t > 0) {
            str += ` ${t} day`;
            if (t > 1)
                str += 's';
        }

        t = Math.floor(second / 3600);
        second -= (3600 * t);
        if (t > 0) {
            str += ` ${t} h`;
        }

        t = Math.floor(second / 60);
        second -= (60 * t);
        if (t > 0) {
            str += ` ${t} m`;
        }

        if (second > 0) {
            str += ` ${second} s`;
        }
        return str.trim()
    }
}