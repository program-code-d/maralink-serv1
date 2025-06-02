var http = require("http");
const fs = require("fs");
const crypto = require("crypto");
const hash = crypto.createHash("sha256");

function hashPassword(passw_string)
{
    const hash = crypto.createHash("sha256");
    var comp_val;
    hash.on("readable", () =>
    {
        const data = hash.read();
        if (data)
        {
            hashed_data = data;
            comp_val = data.toString("hex");
        }
    });
    hash.write(passw_string);
    hash.end();
    return comp_val;
}

var counter = 0;
var preset_state_template = {
    accounts: [],
    admin_passwords: [ "admin" ],
};
var neighborhoods =
    [
        {
            name: `my neighborhood`,
            people: [],
            events: [],
            announcments: [],
            groups: [],
        },
    ]

function create_new_account(neighborhood, password, user)
{
    var salt = (100000000 * Math.random()).toString();
    neighborhoods[ neighborhood ].people.length++
    neighborhoods[ neighborhood ].people[ neighborhoods[ neighborhood ].people.length - 1 ] = {
        name: user,
        password: hashPassword(password + salt),
        admin: 0,
        salt: salt,
        is_DarkMode: false
    };
}

create_new_account(0, 123, `alex`)
create_new_account(0, 123, `roma`)
create_new_account(0, 123, `MARABOO`)
create_new_account(0, 123, `sofia`)
create_new_account(0, 123, `isaac`)

var body = "";

var data;
try
{
    neighborhoods = JSON.parse(fs.readFileSync("neighborhoods.txt"));
} catch (e)
{
    fs.writeFileSync("neighborhoods.txt", JSON.stringify(neighborhoods));
}

// Make events global (default to first neighborhood)
var events = neighborhoods[0].events;

var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
    "Access-Control-Max-Age": 2592000,
};

var GoogleGenAI = require("@google/genai").GoogleGenAI
const { exec } = require('child_process');
const { json } = require("stream/consumers");
const { stringify } = require("querystring");
const ai = new GoogleGenAI({ apiKey: "AIzaSyAdpR-vT9SgyzW6BllYBkAfhbQC7FyLB48" });
var respnce = "";

async function main(content)
{
    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        systemInstruction: "YOU MUST WRITE IN MAXIMUM OF 5 SENTENCES.do not have stuff look small and easy to read",
        contents: content,
    });
    respnce = response.text;
}

function delete_from_array(index, arr)
{
    var i;
    for (i = index; i < arr.length - 1; i++)
    {
        arr[ i ] = arr[ i + 1 ];
    }
    arr.length--;
}

function processReqAndSendResp(req, res)
{
    var respon = ``;
    console.log("body=" + body);
    console.log("request done");
    var req1 = JSON.parse(body);
    var true_false = 0;
    var i;

    // Always update global events to current neighborhood
    if (req1.person && req1.person.neighborhood !== undefined) {
        events = neighborhoods[req1.person.neighborhood].events;
    } else if (req1.neighborhood !== undefined) {
        events = neighborhoods[req1.neighborhood].events;
    }

    if (req1.command == `new_account`)
    {
        create_new_account(req1.neighborhood, req1.password, req1.user)
        respon = { command: `account_registered` };
    }
    else if (req1.command == "get_neighborhoods")
    {
        respon = {
            command: `get_neighborhoods`,
            neighborhoods: JSON.stringify(neighborhoods)
        };
    }
    else if (req1.command == `get_people`)
    {
        var people = []
        for (var i = 0; i < neighborhoods[ req1.person.neighborhood ].people.length; i++)
        {
            people.push({ name: neighborhoods[ req1.person.neighborhood ].people[ i ].name })
        }
        respon = {
            command: `get_people`,
            people: JSON.stringify(people)
        };
    }
    else if (req1.command == `get_my_groups`)
    {
        var groups_im_in_ids = []
        for (var i = 0; i < neighborhoods[ req1.person.neighborhood ].groups.length; i++)
        {
            for (var l = 0; l < neighborhoods[ req1.person.neighborhood ].groups[ i ].people_ids.length; l++)
            {
                if ((neighborhoods[ req1.person.neighborhood ].groups[ i ].people_ids[ l ] == req1.person.user) && (neighborhoods[ req1.person.neighborhood ].people[ neighborhoods[ req1.person.neighborhood ].groups[ i ].people_ids[ l ] ].name == req1.person.name) && (neighborhoods[ req1.person.neighborhood ].people[ neighborhoods[ req1.person.neighborhood ].groups[ i ].people_ids[ l ] ].password == hashPassword(req1.person.password + neighborhoods[ req1.person.neighborhood ].people[ neighborhoods[ req1.person.neighborhood ].groups[ i ].people_ids[ l ] ].salt)))
                {
                    groups_im_in_ids.length++
                    groups_im_in_ids[ groups_im_in_ids.length - 1 ] = i
                }
            }
        }
        var groups_im_in = []
        for (var i = 0; i < neighborhoods[ req1.person.neighborhood ].groups.length; i++)
        {
            for (var l = 0; l < groups_im_in_ids.length; l++)
                if (i == groups_im_in_ids[ l ])
                {
                    groups_im_in.length++
                    groups_im_in[ groups_im_in.length - 1 ] = neighborhoods[ req1.person.neighborhood ].groups[ i ]
                }
        }
        respon = { command: `get_my_groups`, groups_im_in: JSON.stringify(groups_im_in) }
    }
    else if (req1.command == `check_password`)
    {
        // user here means name
        console.log(`user=${ req1.user }   password =${ req1.password }`);
        var user = -1
        for (i = 0; i < neighborhoods[ req1.neighborhood ].people.length; i++)
        {
            if ((neighborhoods[ req1.neighborhood ].people[ i ].name == req1.user) && (neighborhoods[ req1.neighborhood ].people[ i ].password == hashPassword(req1.password + neighborhoods[ req1.neighborhood ].people[ i ].salt)))
            {
                true_false = 1;
                user = i;
                console.log(`i got throught password_check`)
            }
        }

        respon = {
            command: `check_password`,
            pass_exists: true_false,
            user: user,
        }
    }
    else if (req1.command == "rsvp")
    {
        var events = neighborhoods[ req1.person.neighborhood ].events;
        for (var i = 0; i < events.length; i++)
        {
            if (events[ i ].id == req1.eventId)
            {
                if (!events[ i ].rsvps) events[ i ].rsvps = [];
                events[ i ].rsvps.push({
                    person: req1.person.name,
                    details: req1.details
                });
                break;
            }
        }
        respon = { command: "rsvp", status: "success" };
    }
    else if (req1.command == "get_all_events_with_rsvps")
    {
        // Project all events and their RSVPs for the current neighborhood
        respon = {
            command: "all_events_with_rsvps",
            events: neighborhoods[ req1.person.neighborhood ].events
        };
    }
    else if (req1.command == "remove_group")
    {
        console.log(neighborhoods)
        delete_from_array(req1.group_index, neighborhoods[ req1.neighborhood ].groups)
        console.log(neighborhoods)
    }
    else if (req1.command == "update_group")
    {
        neighborhoods[ req1.neighborhood ].groups[ req1.group_index ] = req1.group_data;
        respon = { command: "update_group", status: "success" };
    }
    else if (req1.command == "add_group")
    {
        neighborhoods[ req1.neighborhood ].groups.push(req1.group);
        respon = { command: "add_group", status: "success" };
    }
    else if (req1.command == "day_night_mode")
    {
        neighborhoods[ req1.person.neighborhood ].people[ req1.person.user ].is_DarkMode = req1.is_DarkMode
    }
    else if (req1.command == `get_color`)
    {
        var jk = 1
        respon = {
            command: `get_color`,
            is_DarkMode: neighborhoods[ req1.person.neighborhood ].people[ req1.person.user ].is_DarkMode
        }
    }
    else if (req1.command == `update_announcments`)
    {
        neighborhoods[ req1.person.neighborhood ].announcments = req1.announcments
        respon = { command: "update_announcments" }
    }
    else if (req1.command == `get_announcments`)
    {
        respon = {
            command: `get_announcments`,
            announcments: neighborhoods[ req1.person.neighborhood ].announcments
        };
    }
    else if (req1.command == `change_password`)
    {
        if (
            hashPassword(req1.old_password + neighborhoods[ req1.person.neighborhood ].people[ req1.person.user ].salt) ==
            neighborhoods[ req1.person.neighborhood ].people[ req1.person.user ].password
        )
        {
            neighborhoods[ req1.person.neighborhood ].people[ req1.person.user ].salt = (100000000 * Math.random()).toString();
            neighborhoods[ req1.person.neighborhood ].people[ req1.person.user ].password = hashPassword(
                req1.password_to_change_to + neighborhoods[ req1.person.neighborhood ].people[ req1.person.user ].salt
            );
            respon = {
                command: `change_password`,
                password: neighborhoods[ req1.person.neighborhood ].people[ req1.person.user ].password,
            };
        }
    }
    if (req1.command == `get_morning_brief`)
    {
        var morning_breif_txt = `So`;

        const today = new Date().toLocaleDateString('en-CA');

        // today's events
        var todays_events = neighborhoods[ req1.person.neighborhood ].events.filter(function (ev)
        {
            return ev.start && ev.start.slice(0, 10) === today;
        });

        for (var i = 0; i < todays_events.length; i++)
        {
            var startDate = new Date(todays_events[ i ].start);
            var endDate = new Date(todays_events[ i ].end);
            var startTime = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(':00', '');
            var endTime = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(':00', '');
            morning_breif_txt += ` you have ${ todays_events[ i ].title } from ${ startTime } to ${ endTime }. `;
        }
        var todays_announcements = neighborhoods[ req1.person.neighborhood ].announcments.filter(function (a)
        {
            if (!a.timestamp) return false;
            var annDate = new Date(a.timestamp).toLocaleDateString('en-CA');
            return annDate === today;
        });

        if (todays_announcements.length > 0)
        {
            morning_breif_txt += "Okay as of right now ";
            for (var i = 0; i < todays_announcements.length; i++)
            {
                var ann = todays_announcements[ i ];
                // Find sender by name (not index)
                var senderName = "unknown";
                for (var p = 0; p < neighborhoods[ req1.person.neighborhood ].people.length; p++)
                {
                    if (neighborhoods[ req1.person.neighborhood ].people[ p ].name === ann.person)
                    {
                        senderName = neighborhoods[ req1.person.neighborhood ].people[ p ].name;
                        break;
                    }
                }
                var time = new Date(ann.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
                morning_breif_txt += `${ senderName } posted an announcement at ${ time }, `;
            }
        }

        morning_breif_txt += `Also as of right now `;
        // i do this to make it obj if it isnt
        if (typeof req1.groups_im_in === "string")
        {
            req1.groups_im_in = JSON.parse(req1.groups_im_in);
        }

        for (var i = 0; i < req1.groups_im_in.length; i++)
        {
            var group = req1.groups_im_in[ i ];

            if (Array.isArray(group.chats))
            {
                // Count messages per sender
                var senderCounts = {};
                for (var j = 0; j < group.chats.length; j++)
                {
                    if (!group.chats[ j ].timestamp) continue;
                    var chatDate = new Date(group.chats[ j ].timestamp).toLocaleDateString('en-CA');
                    if (chatDate === today)
                    {
                        var senderIndex = group.chats[ j ].sender;
                        var senderName = neighborhoods[ req1.person.neighborhood ].people[ senderIndex ]
                            ? neighborhoods[ req1.person.neighborhood ].people[ senderIndex ].name
                            : "unknown";
                        if (!senderCounts[ senderName ]) senderCounts[ senderName ] = 0;
                        senderCounts[ senderName ]++;
                    }
                }
                // Add summary to morning brief
                for (var sender in senderCounts)
                {
                    morning_breif_txt += `in group ${ group.name }, ${ sender } sent ${ senderCounts[ sender ] } chat${ senderCounts[ sender ] > 1 ? "s" : "" }. `;
                }
            }
        }

        respon = { command: `get_morning_brief`, content: morning_breif_txt }
    }
    if (req1.command == `start`)
    {
        req1.command = `ask`;
        req1.content = "hello"
    }
    if (req1.command == `ask`)
    {
        main(req1.content);
        req1.command = `pull`
    }
    if (req1.command == `pull`)
    {
        if (respnce != "")
        {
            respon = { command: `pull_finish`, content: respnce };
            respnce = "";
        }
        else
        {
            respon = { command: `pull_pending` };
        }
    }
    if (req1.command == `get_events`)
    {
        respon = { command: `get_events`, events: neighborhoods[ req1.neighborhood ].events };
    }
    if (req1.command == `add_event`)
    {
        neighborhoods[ req1.neighborhood ].events.length++
        neighborhoods[ req1.neighborhood ].events[ neighborhoods[ req1.neighborhood ].events.length - 1 ] = req1.event
        respon = { command: `add_events` };
    }
    if (req1.command == "delete_event")
    {
        delete_from_array(req1.eventId, neighborhoods[ req1.neighborhood ].events)
    }

    res.writeHead(200, headers);
    fs.writeFileSync("neighborhoods.txt", JSON.stringify(neighborhoods));
    var obj_resp = respon;
    console.log(`send to client ${ JSON.stringify(obj_resp) }`);
    res.end(JSON.stringify(obj_resp));
}

function handleHttpReq(req, res)
{
    console.log("method=" + req.method);

    if (req.method == "OPTIONS")
    {
        res.writeHead(204, headers);
        res.end();
        return;
    } else if (req.method == "POST")
    {
        console.log("POST request");
        body = "";

        req.on("data", function (chunk)
        {
            body += chunk;
        });

        req.on("end", function ()
        {
            processReqAndSendResp(req, res);
        });
    } else
    {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Hello, world!\n');
        console.log("Get request");
    }
}

http.createServer(handleHttpReq).listen(80);

console.log("Server 1124:80");