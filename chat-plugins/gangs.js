'use strict';

/********************
 * Gangs plugin of servers
 * Credit:Aakash
 ********************/

let color = require('../config/color');
let fs = require('fs');
let path = require('path');
let writeJSON = true;
let Gang = {};
const INACTIVE_END_TIME = 1 * 60 * 1000; // 1 minute

function NewItem(name, desc, owner, icon) {
    this.name = name;
    this.id = toId(name);
    this.icon = Chat.escapeHTML(icon);
    this.desc = Chat.escapeHTML(desc);
    this.owner = Chat.escapeHTML(owner);
}

function writeGang() {
    if (!writeJSON) return false; //Prevent corruptions
    fs.writeFile('config/Gang.json', JSON.stringify(Gang));
}

function gangDisplay() {
    let output = '<div style="max-height:300px; width: 100%; overflow: scroll""><table style="border:2px solid #000000; border-radius: 5px; width: 100%;"><tr><th colspan="10" style="border: 5px solid #000000; border-radius: 5px" ><h2>Server Gangs</h2></th></tr>' +
        '<tr><th  style="border: 5px solid #000000; border-radius: 5px"">Gang</th><th  style="border: 5px solid #000000; border-radius: 5px"">Description</th><th  style="border: 5px solid #000000; border-radius: 5px"">Owner</th><th  style="border: 5px solid #000000; border-radius: 5px"">Icon</th></tr>';

    for (let i in Gang) {
        if (!Gang[i]) continue;
        output += '<tr><td style="border: 5px solid #000000; width: 20%; text-align: center"><button class="button" name="send" value="/Gang info ' + Gang[i].id + '">' + Gang[i].name + '</button></td><td style="border: 5px solid #000000; width: 70%; text-align: center">' + Gang[i].desc + '</td><td style="border: 5px solid #000000; width: 10%; text-align: center">' + Gang[i].owner + '</td><td style="border: 5px solid #000000; width: 10%; text-align: center"><img src=' + Gang[i].icon + ' /></td></tr>';
    }
    output += '</table></div>';
    return output;
}

try {
    fs.accessSync('config/Gang.json', fs.F_OK);
    let raw = JSON.parse(fs.readFileSync('config/Gang.json', 'utf8'));
    Gang = raw;
} catch (e) {
    fs.writeFile('config/Gang.json', "{}", function(err) {
        if (err) {
            console.error('Error while loading Gang: ' + err);
            Gang = {
                closed: true,
            };
            writeJSON = false;
        } else {
            console.log("config/Gang.json not found, creating a new one...");
        }
    });
}

function ganginfoDisplay(gang, target) {
    let info = Gang[toId(target)];
    let visuals = '<div style="max-height:300px; width: 100%; overflow: scroll; border:2px solid #000000; border-radius: 5px; width: 100%;"><center><img src="' + info.icon + '" /><br><b><font color="Blue">Gang</font></b>:<b>' + info.name + '</b><br><b><font color="blue">GodFather</font>:' + info.owner + '</b><br><b>' + info.desc + '</b><br><button name="send" value="/gang join ' + info.name + '">Join Us!!</button></center>';
    return visuals;
}

function isCapo(user) {
    if (user.gangrank !== 'capo' || user.gangrank !== 'godfather') return false;
    return true;
}

function isGodfather(user, gang) {
    if (user.gangrank !== 'godfather') return false;
    return true;
}

exports.commands = {

    gang: {
        create: function(target, room, user, connection, cmd, message) {
            if (!this.can('roomowner')) return false;
            target = target.split(',');
            if (!target[2]) return this.parse('/gang help');
            if (Gang[toId(target[0])]) return this.errorReply(target[0] + ' is already in the server gang list.');
            //if (isNaN(Number(target[2]))) return this.parse('/gang help');
            Gang[toId(target[0])] = new NewItem(target[0], target[1], target[2], target[3]);
            writeGang();
            return this.sendReply('|html| The gang <b>' + target[0] + '</b> was created.');
        },

        delete: 'remove',
        remove: function(target, room, user, connection, cmd, message) {
            if (!this.can('roomowner')) return false;
            if (!target) return this.parse('/gang help');
            if (!Gang[toId(target)]) return this.errorReply(target + ' is not in the server gang list.');
            delete Gang[toId(target)];
            writeGang();
            return this.sendReply('|html| The gang <b>' + target + '</b> was removed.');
        },

        join: function(target, room, user) {
            if (!target) return this.errorReply("You must specify a user.");
            let gang = toId(target);
            if ((Db.gang.get(user.userid, 0))) return this.errorReply("You are already in a gang");
            if (!Gang[toId(target)]) return this.errorReply("This gang does not exist.");
            Db.gang.set(user.userid, gang);
            user.gang = gang;
            this.sendReply("|raw| You have joined the gang: <b>" + gang + " </b>");
        },

        confirmleave: "leave",
        leave: function(target, room, user, connection, cmd) {
            let gang = toId(target);
            //if ((Db.gang.get(user.userid, gang))) return this.errorReply("You are not currently in a gang!");
            if (isCapo(user.userid)) return this.errorReply("You cannot leave a gang if you have a gang rank of godfather or capo");
            if (!target || (Db.gang.get(user.userid, 0))) return this.errorReply("Please specify what gang you are leaving to confirm your choice.");
            if (Db.money.get(user.userid, 0) < 10) return this.errorReply("You need 10 bucks to leave a gang feelsjig... otherwise the godfathers will hunt you down feelsnv...");
            if (!/^(turf|gang)?\s?confirmleave/i.test(cmd)) return this.errorReply("You will require a fee of 10 bucks to leave a gang.  To confirm your choice, do /turf confirmleave [gang name]");
            Db.money.set(user.userid, Db.money.get(user.userid, 0) - 10);
            Db.gangranks.remove(user.userid);
            Db.gang.remove(user.userid);
            this.sendReply("|raw|You have left the gang <b>" + toId(target) + "</b>.");

        },

        info: function(target, room, user) {
            if (!this.runBroadcast()) return;
            if (!target) return this.errorReply("You must specify a gang.");
            let info = Gang[toId(target)];
            let gang = toId(target);
            if (!Gang[toId(target)]) return this.errorReply("This gang does not exist.");
            let display = ganginfoDisplay(gang, target);
            this.sendReply("|raw|" + display);
        },

        godfather: function(target, room, user) {
            let parts = target.split(',');
            if (parts.length < 2) return this.errorReply("You must specify a user and a gang");
            let gang = parts[1];
            //if (!Users(toId(parts[0]))) return this.errorReply("User not found.");
            //if (!Gang[toId(target)]) return this.errorReply("This gang does not exist.");
            let targetUser = Users(toId(parts[0]));
            if (!this.can('makechatroom')) return this.errorReply("/gang godfather - Access denied.");
            Db.gangranks.set(targetUser, 'godfather');
            Db.gang.set(targetUser, gang);
            user.gangrank = 'godfather';
            user.gang = gang;
            this.sendReply(targetUser + " has been promoted to godfather of the gang: " + gang);
            targetUser.popup("You have been promoted to godfather of the gang: " + gang + " by " + user + ".");
        },

        promote: function(target, room, user) {
            if (!target) return this.errorReply("You must specify a user.");
            let targetUser = toId(target);
            if (!Users(targetUser)) return this.errorReply("User not found.");
            if (!isCapo(user.userid) || user.gang === '' && !this.can('makechatroom')) return this.errorReply("/gang promote - Access denied.");
            if (targetUser.gang !== user.gang && !this.can('makechatroom')) return this.errorReply("User is not a member of your gang.");
            Db.gangranks.set(targetUser, 'capo');
            user.gangrank = 'capo';
            this.sendReply(targetUser + " has been promoted to capo in the gang: " + user.gang);
            targetUser.popup("You have been promoted to capo in the gang: " + user.gang + " by " + user + ".");
        },

        demote: function(target, room, user) {
            if (!target) return this.errorReply("You must specify a user.");
            let targetUser = toId(target);
            if (!Users(targetUser)) return this.errorReply("User not found.");
            if (!isGodfather(user) || user.gang === '' && !this.can('makechatroom')) return this.errorReply("/gang demote - Access denied.");
            if (targetUser.gang !== user.gang && !this.can('makechatroom')) return this.errorReply("User is not a member of your gang.");
            Db.gangranks.set(targetUser, '');
            user.gangrank = '';
            this.sendReply(targetUser + " has been demoted in the gang: " + user.gang);
            targetUser.popup("You have been demoted in the gang: " + user.gang + " by " + user + ".");
        },

        members: function(target, room, user) {
            if (!this.runBroadcast()) return false;
            //if ((target && !gangs.hasOwnProperty(toId(target))) || (!target && !gangs.hasOwnProperty(room.id))) return this.errorReply("You must specify a gang.");
            if (!target) return this.errorReply("You must specify a gang.");
            let targetGang = target ? toId(target) : room.id;
            let gangData = Db.gang.object();
            let gangRanks = Db.gangranks.object();
            let members = {
                godfather: [],
                capo: [],
                grunt: [],
            };
            // sort the members
            Object.keys(gangData).filter(u => gangData[u] === targetGang).forEach(u => members[gangRanks[u] || "grunt"].push(u));
            // build the list
            let display = Object.keys(members).map(u => "<b>" + u.charAt(0).toUpperCase() + u.slice(1) + ": </b><br />" + members[u].sort().map(i => Users.get(i) && Users.get(i).connected ? "<b>" + i + "</b>" : i).join(", ")).join("<br /><br />");
            this.sendReplyBox("<div style=\"max-height: 250px; overflow-y: scroll\">" + display + "</div>");
        },

        help: function(target, room, user, connection, cmd, message) {
            let reply = '<b>Gang commands</b><br/>';
            reply += '/gang - Load the list of gangs.<br/>';
            reply += '/gang join - join\'s the  gangs.<br/>';
            reply += '/gang leave - leave\'s the gangs.<br/>';
            reply += '/gang members [name] - Gives the list of the members in a gang<br/>';
            reply += '/gang info [name] - Gives the information of the gang<br/>';
            reply += '/gang promote [username] - promotes the user to a rank<br/>';
            reply += '/gang demote [username] - demotes the user to regular rank<br/>';
            if (user.can('roomowner')) {
                reply += '<b>Administrative gang commands:</b><br/>';
                reply += '/gang create [name], [description], [owner], [symbol] - Create\'s a gang.<br/>';
                reply += '/gang delete [name] - delete\'s a gang.<br/>';
                reply += '/gang godfather [user], [gang] - promotes the user to the godfather of the rank.<br/>';
            }
            return this.sendReplyBox(reply);
        },

        reopen: '',
        '': function(target, room, user, connection, cmd, message) {
            if (cmd === 'reopen') return user.sendTo(room, '|uhtmlchange|Gang' + user.userid + '|' + gangDisplay());
            return user.sendTo(room, '|uhtml|gang' + user.userid + '|' + gangDisplay());
        },

    },
};
