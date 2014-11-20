$(document).ready( function() {
    
    $(".display").hide();
    $(".results").hide();

    $(".code").val(localStorage.getItem("code"));

    $(".access").click( function() {
        
        var code = $(".code").val();
        $(".loading").html("please wait... (the first time will take about 10 seconds to load everything)");

        localStorage.setItem("code", code);
        
        Eventbrite({'access_token': code}, function(eb_client) {

            /**
             * Make map of member email -> array of events.
             * Called immediately.
             * */
            var member_events = {};
            (function make_member_events() {
                var DEBUG = false;

                if (!DEBUG && sessionStorage.member_events) {
                    member_events = JSON.parse(sessionStorage.getItem("member_events"));
                    $(".display").show(); 
                    $(".loading").html("");
                } else {

                    setTimeout(function() {
                        $(".display").show(); 
                        $(".loading").html("");

                    }, 10000);

                    // Get all events.
                    eb_client.user_list_events( {"only_display":"id,title,start_date", "asc_or_desc":"asc"}, function( response ) { 
                        var events = response.events;
                        $.each( events, function( index, e ) {
                            var eid = e.event.id;
                            var etitle = e.event.title;
                            var start = e.event.start_date;
                            // For each event, get attendees. 
                            eb_client.event_list_attendees( {'id': eid, "only_display":"first_name,last_name,email,barcodes", "show_full_barcodes":true}, function( response ) {
                                // Add event to map using each attendee's email as name
                                var attendees = response.attendees;
                                
                                $.each( attendees, function(index, attendee) {
                                    var person = attendee.attendee;
                                    var email = person.email;
                                    var attended = person.barcodes[0].barcode.status == "used"
                                    
                                    var data = { "title":etitle, "start_date":start, "attended":attended };
                                    if (email in member_events) {
                                        member_events[email].push(data);
                                    } else { 
                                        member_events[email] = [data];
                                    }
                                });
                                sessionStorage.setItem("member_events", JSON.stringify(member_events));
                                
                            });
                        });
                    });
                }
            })();
    
        
            // param eid: eventbrite id
            // param f: filter function
            var display_event_stats = function(eid, f) {
                $(".info").html("patience yo");
                // Get list of attendees from eventbrite.
                var result_html = $(".results tbody").html("");
                eb_client.event_list_attendees({'id': eid}, function( response ){
                    var attendees = response.attendees;
                    var newbies = 0;
                    // For each attendee, show facebook picture, how many past total events
                    $.each( attendees, function(index, attendee) {
                        var person = attendee.attendee;
                        var name = person.first_name + " " + person.last_name;
                        console.log("vjw " + name);
                        var email = person.email;
                        var events = member_events[email]; //TODO sort by date? Technically, should be sorted on eventbrite side..
                        if (f !== undefined) {
                            events = $.grep(events, f);
                        }
                        var select_html = $("<select></select>");
                        $.each( events, function(index, e) {
                            var option = $("<option>" + e.title + " (" + e.start_date.substr(0,10) + ")</option>");
                            if (e.attended === true) {
                                option.append(" -- SHOWED UP");
                            }
                            select_html.append(option);
                        });

                        if (events.length == 1) {
                            newbies++;
                        }
                        
                        var row = $("<tr></tr>")
                            .append("<td>" + name + "</td>")
                            .append("<td><input size='30' class='email' readonly='readonly' type='text' value='" + email +"'/></td>")
                            .append("<td>"+events.length+"</td>")
                            .append($("<td></td>")
                            .append(select_html));
                        result_html.append(row);
                    });
                    // Display general event info.
                    $(".results").show();
                    $(".info").html("").prepend("<p>total registrations: " + attendees.length + "</p>").prepend("first timers: " + newbies);

                    eb_client.event_get({'id':eid}, function( response ) {
                        $(".info").prepend("<h2>"+response.event.title+" on " + response.event.start_date.substr(0,10) + "</h2>");
                    });
                });

            };

            $(".event-attendees input[type='submit']").click( function() {
                var eid = $(".event-attendees input[name='eid']").val();
                display_event_stats(eid);
            });

            $(".dinner-series input[type='submit']").click( function() {

                f = function(eb_event) {
                    return eb_event.title.indexOf("Dinner Series") > -1;
                };
                var eid = $(".dinner-series input[name='eid']").val();
                display_event_stats(eid, f)
     
            });

        });
    });
});
$(document).delegate( ".email", "click", function() {
    $(this).select();
});
