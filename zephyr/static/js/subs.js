var subs = (function () {

var exports = {};

var stream_set = {};

function case_insensitive_subscription_index(stream_name) {
    var i;
    var name = stream_name.toLowerCase();

    for (i = 1; i < stream_list.length; i++) {
        if (name === stream_list[i].toLowerCase()) {
            return i;
        }
    }
    return -1;
}

function add_to_stream_list(stream_name) {
    var stream_sub_row;

    if (!exports.have(stream_name)) {
        stream_list.push(stream_name);
        stream_set[stream_name.toLowerCase()] = true;

        stream_sub_row = $('#subscriptions_table').find('button[value="' + stream_name + '"]');
        if (stream_sub_row.length) {
            stream_sub_row.text("Unsubscribe")
                .removeClass("btn-primary")
                .unbind("click")
                .removeAttr("onclick")
                .click(function (event) {exports.unsubscribe(stream_name);});
        } else {
            $('#subscriptions_table').prepend(templates.subscription({subscription: stream_name}));
        }
    }
}

function remove_from_stream_list(stream_name) {
    delete stream_set[stream_name.toLowerCase()];
    var removal_index = case_insensitive_subscription_index(stream_name);
    if (removal_index !== -1) {
        stream_list.splice(removal_index, 1);
    }
}

exports.fetch = function () {
    $.ajax({
        type:     'POST',
        url:      '/json/subscriptions/list',
        dataType: 'json',
        timeout:  10*1000,
        success: function (data) {
            $('#subscriptions_table tr').remove();
            if (data) {
                $.each(data.subscriptions, function (index, name) {
                    $('#subscriptions_table').append(templates.subscription({subscription: name}));
                });
            }
            $('#streams').focus().select();
        },
        error: function (xhr) {
            report_error("Error listing subscriptions", xhr, $("#subscriptions-status"));
        }
    });
};

exports.subscribe_for_send = function (stream, prompt_button) {
    $.ajax({
        type:     'POST',
        url:      '/json/subscriptions/add',
        data: {"subscriptions": JSON.stringify([stream]) },
        dataType: 'json',
        timeout:  10*60*1000, // 10 minutes in ms
        success: function (response) {
            add_to_stream_list(stream);
            compose.finish();
            prompt_button.stop(true).fadeOut(500);
        },
        error: function (xhr, error_type, exn) {
            report_error("Unable to subscribe", xhr, $("#home-error"));
        }
    });
};

exports.have = function (stream_name) {
    return (stream_set[stream_name.toLowerCase()] === true);
};

function ajaxSubscribe(stream) {
    $.ajax({
        type: "POST",
        url: "/json/subscriptions/add",
        dataType: 'json', // This seems to be ignored. We still get back an xhr.
        data: {"subscriptions": JSON.stringify([stream]) },
        success: function (resp, statusText, xhr, form) {
            if ($("#streams").val() === stream) {
                $("#streams").val("");
            }
            var name, res = $.parseJSON(xhr.responseText);
            if (res.subscribed.length === 0) {
                name = res.already_subscribed[0];
                report_success("Already subscribed to " + name, $("#subscriptions-status"));
            } else {
                name = res.subscribed[0];
                report_success("Successfully added subscription to " + name,
                               $("#subscriptions-status"));
            }
            add_to_stream_list(name);
            $("#streams").focus();
        },
        error: function (xhr) {
            report_error("Error adding subscription", xhr, $("#subscriptions-status"));
            $("#streams").focus();
        }
    });
}

exports.unsubscribe = function (stream) {
    $.ajax({
        type: "POST",
        url: "/json/subscriptions/remove",
        dataType: 'json', // This seems to be ignored. We still get back an xhr.
        data: {"subscriptions": JSON.stringify([stream]) },
        success: function (resp, statusText, xhr, form) {
            var name, res = $.parseJSON(xhr.responseText);
            if (res.removed.length === 0) {
                name = res.not_subscribed[0];
                report_success("Already not subscribed to " + name,
                               $("#subscriptions-status"));
            } else {
                name = res.removed[0];
                report_success("Successfully removed subscription to " + name,
                               $("#subscriptions-status"));
            }
            $('#subscriptions_table').find('button[value="' + name + '"]').text("Subscribe")
                .addClass("btn-primary")
                .unbind("click")
                .removeAttr("onclick")
                .click(function (e) {
                    e.preventDefault();
                    ajaxSubscribe(name);
                });
            remove_from_stream_list(name);
            typeahead_helper.update_autocomplete();
            $("#streams").focus();
        },
        error: function (xhr) {
            report_error("Error removing subscription", xhr, $("#subscriptions-status"));
            $("#streams").focus();
        }
    });
};

$(function () {
    var i;
    // Populate stream_set with data handed over to client-side template.
    for (i = 0; i < stream_list.length; i++) {
        stream_set[stream_list[i].toLowerCase()] = true;
    }

    $("#add_new_subscription").on("submit", function (e) {
        e.preventDefault();
        ajaxSubscribe($("#streams").val());
    });
});

return exports;

}());
