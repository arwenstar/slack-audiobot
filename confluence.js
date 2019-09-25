var exec = require('child_process').exec;
var Slack = require('slack-client');
var fs = require('fs');
var config = require('./config/config.js');
var os = require('os');
var platform = os.platform();
var https =require('https')
const data = JSON.stringify({
    type:'page',
    title:'Creating page',
    space:{
        key:'TTD'
    },
    body:{
        storage:{
            value:'This is a new page',
            representation:'storage'
        },
    }
})
const options = {
    hostname:'tokopedia.atlassian.net',
    path:'/wiki/rest/API/content',
    method:'POST',
    headers:{
        'Authorization':'',
        'Content-Type':'application/json',
        'Content-Length':data.length
    },
}
//use this to set whether feedback bot is listening. If he's not, feedback will not be given - on at start.

var started = true;
var slack = new Slack(config.token, true, true);

var makeMention = function(userId) {
    return '<@' + userId + '>';
};

var isDirect = function(userId, messageText) {
    var userTag = makeMention(userId);
    return messageText &&
           messageText.length >= userTag.length &&
           messageText.substr(0, userTag.length) === userTag;
};

var getOnlineHumansForChannel = function(channel) {
    if (!channel) return [];

    return (channel.members || [])
        .map(function(id) { return slack.users[id]; })
        .filter(function(u) { return !!u && !u.is_bot && u.presence === 'active'; });
};

slack.on('open', function () {
    var channels = Object.keys(slack.channels)
        .map(function (k) { return slack.channels[k]; })
        .filter(function (c) { return c.is_member; })
        .map(function (c) { return c.name; });

    var groups = Object.keys(slack.groups)
        .map(function (k) { return slack.groups[k]; })
        .filter(function (g) { return g.is_open && !g.is_archived; })
        .map(function (g) { return g.name; });

    console.log('Welcome to Slack. You are ' + slack.self.name + ' of ' + slack.team.name);

    if (channels.length > 0) {
        console.log('You are in: ' + channels.join(', '));
    }
    else {
        console.log('You are not in any public channels.');
    }

    if (groups.length > 0) {
       console.log('You are in the following private channels: ' + groups.join(', '));
    }
});

slack.on('message', function(message) {
    //get current time
    currentTime = Math.floor(Date.now()/1000);
    if(currentTime - message.ts > 10) {
        //current message is older than 10 seconds, so ignore this - this is to stop the bot from spamming the channel like it did that time.
        return false;
    }


    var channel = slack.getChannelGroupOrDMByID(message.channel);
    var user = slack.getUserByID(message.user);

    if(message.type === 'message') {
        //get message text
        var messageText = message.text;
        if(messageText) {
            var confluence = message.text.indexOf("confluence"); 
            if((confluence > -1) && (started === true)) {
                var hasCreate = message.text.indexOf("create");
                if (hasCreate > -1) {
                    const req = https.request(options, (res) => {
                        console.log(`statusCode: ${res.statusCode}`)
                      
                        res.on('data', (d) => {
                          process.stdout.write(d)
                        })
                      })
                      
                      req.on('error', (error) => {
                        console.error(error)
                      })
                      
                      req.write(data)
                      req.end()
                      
                    console.log("creating page")
                }
            }

            if(isDirect(slack.self.id, message.text)) {
                //spit out a list of valid sounds that bot can play
                var trimmedMessage = message.text.substr(makeMention(slack.self.id).length).trim();
                if((trimmedMessage === 'list' || trimmedMessage === ': list') && (started === true)) {
                    channel.send('@' + user.name + ': ' + "`create`");

                }
                //spit out a list of help commands
                if((trimmedMessage === 'help' || trimmedMessage === ': help') && (started === true)) {
                    
                }
            }
        }

    }
});

slack.login();
