vTiger = (function () {
//https://vtiger.wildix.com/layouts/vlayout/skins/images/Call_white.png

    var sessionName = null;
    var callList = {};


    function bindEvents(){
        // if updated content
        $(document).on('postajaxready', modifyDOM)
        $('#detailView .fieldValue span[data-field-type="phone"]').closest('.fieldValue').on('Vtiger.Field.Updated', 'input', modifyDOM);
        $('#detailView input[name="phone"]').on('Vtiger.Field.Updated', modifyDOM);


        $(document).on('click', '#WildixInteractionPopup .call .crmActions button', onClickCallAction);
        $(document).on('click', '#WildixInteractionPopup span.btnToogleCallsView', onClickToogleBtn);
    }

    function initWildixInteraction(){
        Wildix.Interaction.isInitialized(function(isInitialized){

            bindEvents();

            Wildix.Interaction.getCalls(function(calls){
                modifyDOM();

                onCall({
                    type: 'restore',
                    call: calls.result.records
                })
            });

            Wildix.Interaction.on('calls', onCall);

            $('body').append('<div id="WildixInteractionPopup"><div class="callsView"></div><span class="btnToogleCallsView" style="display:none;"><i class="icon-chevron-left"></i></span></div>')
        });
    }


    function addPopup(call){
        removePopup(call.channel);
        getCallActions(call);

        var html = "" +
                "<div class='call modal' number='"+call.number+"' channel='"+call.channel+"' style='position: relative;'>" +
                    "<div class='header modal-header'><h4>"+((call.direction == 'outgoing')? 'Outgoing call': 'Incoming call')+"</h4></div>" +
                    "<div class='content modal-body'>" +
                        "<div class='name'><h4>"+call.name+"</h4></div>" +
                        "<div class='number'>"+call.number+"</div>" +
                    "</div>" +
                    "<div class='crmActions modal-footer'>" +
                        "<button class='btn btn-default' disabled>Lead</button>" +
                        "<button class='btn btn-default' disabled>Contact</button>" +
                        "<button class='btn btn-default' disabled>Ticket</button>" +
                        "<button class='btn btn-default' disabled>Tickets</button>" +
                    "</div>" +
                "</div>";
        $('#WildixInteractionPopup .callsView').append(html);
        updatePosition();
    }

    function removePopup(channel){
        $('#WildixInteractionPopup .call[channel="'+channel+'"]').remove();
        updatePosition();
    }


    function addLink(el){
        if(!el.hasClass('phoneNumber') && el.find('.phoneNumber').length == 0){
            var phoneNumber = $('<a href="javascript:void(0);" class="phoneNumber" />')
                .html(el.text())
                .click(onClickOnThePhone);
            el.html(phoneNumber);
        }
    }

    function modifyDOM(){
        if(app.getModuleName() == 'Leads' || app.getModuleName() == 'Contacts' || app.getModuleName() == 'Accounts' || app.getModuleName() == 'Vendors'){
            // list view
            $('.listViewEntriesDiv .listViewEntryValue[data-field-type="phone"], #detailView .fieldValue span.value[data-field-type="phone"]').each(function(i, element){
                if($.trim($(this).text()) != ''){
                    addLink($(this));
                }
            });

            // details view
            $('#detailView input[name="phone"]').each(function(i, element){
                var phone = $(this).closest('.fieldValue').find('.value');
                if($.trim(phone.text()) != ''){
                    addLink(phone);
                }
            });
        }
    }

    function checkToogleBtn(){
        if($('#WildixInteractionPopup .call').length > 0){
            $('#WildixInteractionPopup .btnToogleCallsView').show();
        }else{
            $('#WildixInteractionPopup .btnToogleCallsView').hide();
        }
    }

    function getCallActions(call, callback){

        var actions = [];
        var contact = null;
        var lead = null;
        var countSearchObject = 2;

        function maybeSuccess(){
            if(countSearchObject == 0){

                actions.push({
                    type: lead ? 'showLead' : 'createLead',
                    text: lead ? 'Show Lead' : 'Add Lead',
                    id: lead ? lead.id.split('x')[1] : ''
                });

                actions.push({
                    type: contact ? 'showContact' : 'createContact',
                    text: contact ? 'Show Contact' : 'Add Contact',
                    id: contact ? contact.id.split('x')[1] : ''
                });

                actions.push({
                    type: 'createTicket',
                    text: 'Add Ticket',
                    id: ''
                });

                actions.push({
                    type: contact ? 'showTickets' : 'showAllTickets',
                    text: contact ? 'Show Tickets' : 'All Tickets',
                    id: contact ? contact.firstname + ' ' + contact.lastname : ''
                });

                var html = "";
                for(var j=0; j < actions.length; j++){
                    var action = actions[j];
                    switch (action.type) {
                        case 'createLead':
                        case 'createContact':
                        case 'createTicket':
                                html += "<button class='btn btn-default' type='"+action.type+"' data-id='"+action.id+"'><i class='icon-plus'></i>&nbsp;"+action.text+"</button>";
                            break;
                        case 'showLead':
                        case 'showContact':
                        case 'showTickets':
                        case 'showAllTickets':
                                html += "<button class='btn btn-default' type='"+action.type+"' data-id='"+action.id+"'><i class='icon-eye-open'></i>&nbsp;"+action.text+"</button>";
                            break;
                        default:
                            break;
                    }
                }
                $('#WildixInteractionPopup .call[channel="'+call.channel+'"] .crmActions').html(html);
            }
        }


        AppConnector.request({
            url: "webservice.php",
            type: "GET",
            dataType: "json",
            data: {
                operation:'query',
                sessionName: sessionName,
                query: "select * from Leads WHERE phone='"+call.number+"';"
            }
        }).then(function(data){
                if(data && data.success === true && data.result && data.result.length > 0){
                    lead = data.result[0];
                }
                countSearchObject--;
                maybeSuccess();
            }
        );

        AppConnector.request({
            url: "webservice.php",
            type: "GET",
            dataType: "json",
            data: {
                operation:'query',
                sessionName: sessionName,
                query: "select * from Contacts WHERE phone='"+call.number+"';"
            }
        }).then(function(data){
                if(data.success === true && data.result && data.result.length > 0){
                    contact = data.result[0];
                }
                countSearchObject--;
                maybeSuccess();
            }
        );
    }

    var visible = true;
    function updatePosition(){
        var left = (($('#WildixInteractionPopup .callsView').width()) * (-1));
        if(left == 0){
            visible = true;
        }
        if(!visible){
            $('#WildixInteractionPopup').css({
                'left': left
            });
            $('#WildixInteractionPopup .btnToogleCallsView i').attr('class', 'icon-chevron-right')
        }else{
            $('#WildixInteractionPopup').css({
                left: 0
            })
            visible = true;
            $('#WildixInteractionPopup .btnToogleCallsView i').attr('class', 'icon-chevron-left')
        }
    }

    function onCall(event){
        //console.log('onCall', event);
        if(event.type == 'new' || event.type == 'restore'){
            var calls = event.call;
            if(!(calls instanceof Array)){
                calls = [calls];
            }

            for(var i=0; i < calls.length; i++){
                callList[calls[i].channel] = calls[i];
                addPopup(calls[i]);

                //Call history
                updateHistory(calls[i], event.type);
            }
        }else if(event.type == 'remove'){
            if(callList.hasOwnProperty(event.call.channel)){
                delete callList[event.call.channel];
                removePopup(event.call.channel);
            }

            //Call history
            updateHistory(event.call, event.type);

        }else if(event.type == 'update'){
            var popup = $('#WildixInteractionPopup .call[channel="'+event.call.channel+'"]');
            popup.find('.name h4').html(event.call.name);
            popup.find('.number').html(event.call.number);
            popup.attr('number', event.call.number);

            //Call history
            updateHistory(event.call, event.type);
        }

        checkToogleBtn();
    }

    function onClickCallAction(event){
        event.stopPropagation();

        var btn = $(event.target);

        var action = btn.attr('type');
        var id = btn.attr('data-id');
        var channel = btn.closest('.call').attr('channel');

        var name = '';
        var number = '';

        if(callList.hasOwnProperty(channel)){
            name = callList[channel].name;
            number = callList[channel].number;
        }

        switch (action) {
            case 'createLead': window.location='?module=Leads&view=Edit&firstname='+name+'&phone='+number+'';
                break;
            case 'createContact': window.location='?module=Contacts&view=Edit&firstname='+name+'&phone='+number+'';
                break;
            case 'createTicket': window.location='?module=HelpDesk&view=Edit';
                break;
            case 'showContact': window.location='?module=Contacts&view=Detail&record='+id+'&mode=showDetailViewByMode&requestMode=full';
                break;
            case 'showLead': window.location='?module=Leads&view=Detail&record='+id+'&mode=showDetailViewByMode&requestMode=full';
                break;
            case 'showTickets': window.location='?module=HelpDesk&page=1&view=List&viewname=13&search_params=[[["contact_id","c","'+id+'"]]]';
                break;
            case 'showAllTickets': window.location='?module=HelpDesk&view=List';
                break;
            default:
                break;
        }
    }

    var arrTimeout = {};

    function updateHistory(call, operation){
        var timeout = 1000;
        var divider = 1;
        if(arrTimeout[call.channel] && arrTimeout[call.channel].timer){
            clearTimeout(arrTimeout[call.channel].timer);
            arrTimeout[call.channel].timer = null;

            divider = arrTimeout[call.channel].divider;
            divider++;
        }

        arrTimeout[call.channel] = {
            timer: setTimeout(function(){
                delete arrTimeout[call.channel];

                //Call history
                AppConnector.request({
                    url: "WebCRM/vTiger/CallHistoryService.php",
                    type: "GET",
                    dataType: "json",
                    data: {
                        operation:'query',
                        sessionName: sessionName,
                        query: operation.toUpperCase(),
                        call: call
                    }
                });
            }, Math.round(timeout / divider)),
            divider: divider
        }
    }

    function onClickToogleBtn(event){
        if(visible){
            visible = false;
        }else{
            visible = true;
        }
        updatePosition();
        checkToogleBtn();
    }


    function onClickOnThePhone(event){
        event.stopPropagation();

        var phone = $.trim($(event.target).text());
        if(phone != ''){
            Wildix.Interaction.call(phone, function(result){
                //console.log('call macked: ', result)
            });
        }

        return false;
    }


    return {
        run: function () {

            AppConnector.request({
                url: "webservice.php",
                type: "POST",
                dataType: "json",
                data: {
                    operation: "extendsession"
                }
            }).then(function(data){
                    if(data && data.success == true){
                        // if user logged in
                        sessionName = data.result.sessionName;
                        initWildixInteraction();
                    }
                }
            );
        }
    }
})();


$(document).ready(function(){
    if(window.AppConnector){
        vTiger.run();
    }
});
