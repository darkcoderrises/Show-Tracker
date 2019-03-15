var login = require('facebook-chat-api');
var jsondb = require('lo-jsondb');
var fs = require('fs');

let config = JSON.parse(fs.readFileSync("./config.json"));
let fbapi = null;
let harshil_id = config.facebook.myID;

const readline = require("readline");

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let stack = ['testing'];

let execute = () => {
    if (!fbapi)
        return;
    while (stack.length > 0) {
        let msg = stack.pop();
        console.log("Sending ", msg);
        fbapi.sendMessage(msg, harshil_id);
    }
};



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
    login({appState: JSON.parse(fs.readFileSync('appstate.json', 'utf8'))}, {pageID: config.facebook.alfredID}, (err, api) => {
        if(err) return console.error(err);
        fbapi = api;
        execute();
        rl.close();
    });
}


