import request from 'request';
import parser from 'episode-parser';
var qbtApi = require('qbittorrent-api');
var fs = require('fs');
var login = require('facebook-chat-api');
var jsondb = require('lo-jsondb');

let config = JSON.parse(fs.readFileSync("./config.json"));
let fbapi = null;
let harshil_id = config.facebook.myID;
let show_db = jsondb("show_data", {pretty: true});

let stack = [];

let execute = () => {
    if (!fbapi)
        return;
    while (stack.length > 0) {
        let msg = stack.pop();
        console.log("Sending ", msg);
        fbapi.sendMessage(msg, harshil_id);
    }
};

let sendMessage = (msg) => {
    stack.push(msg);
    execute();
};

const readline = require("readline");

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

if (!fs.existsSync('appstate.json')) {
    login({email: config.facebook.username, password: config.facebook.password}, {pageID: config.facebook.alfredID}, (err, api) => {
        if(err) {
            switch (err.error) {
                case 'login-approval':
                    console.log('Enter code > ');
                    rl.on('line', (line) => {
                        err.continue(line);
                        rl.close();
                    });
                    break;
                default:
                    console.error(err);
            }
            return;
        }
        fs.writeFileSync('appstate.json', JSON.stringify(api.getAppState()));
        fbapi = api;
        execute();
        rl.close();
    });
} else {
    login({appState: JSON.parse(fs.readFileSync('appstate.json', 'utf8'))}, (err, api) => {
        if(err) return console.error(err);
        fbapi = api;
        execute();
        rl.close();
    });
}

Date.prototype.isSameDateAs = function(pDate) {
    return (
        this.getFullYear() === pDate.getFullYear() &&
        this.getMonth() === pDate.getMonth() &&
        this.getDate() === pDate.getDate()
    );
}

let qbt = qbtApi.connect(config.qbittorent.host, config.qbittorent.username, config.qbittorent.password);
let list = config.shows;

list.forEach(val => {
    let s = show_db.find({show_id: val[0]});
    if (s.length == 0) {
        show_db.save({show_id: val[0], name: val[1], shows: {}}); 
    }
});

list.forEach(val => {
    let id = val[0];
    let name = val[1];
    console.log(id, name);

    request('https://eztv1.unblocked.is/api/get-torrents?imdb_id='+id, (error, response, body) => {
        let torrents;
        try {
            torrents = JSON.parse(response.body).torrents;
        } catch (except) {
            console.log(response);
            return;
        }

        let downloading = show_db.findOne({show_id:id});

        try {
            torrents.forEach(torrent => {
                let result = parser(torrent.filename);
                let date = new Date(torrent.date_released_unix * 1000);
                let episode = result.episode;;
                let season = result.season;
                let url = torrent.magnet_url;
                let ep_id = episode + '-' + season;

                let today = new Date();
                if (today.isSameDateAs(date)) {
                    if (downloading.shows[ep_id])
                        return;
                    downloading.shows[ep_id] = 1;
                    let folder_name = "/home/harshil/Media/Series/"+name+"/"+season+"/";
                    console.log('downloading');
                    qbt.add(url, folder_name);
                    sendMessage("Downloading " + name + " (" + season + "," + episode + ")");
                }
            });

            show_db.save(downloading);
        } catch (except) {
            console.log(name, 'hi');
        }
    });
});
