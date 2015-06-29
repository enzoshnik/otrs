// --
// Copyright (C) 2001-2012 OTRS AG, http://otrs.org/
// --
// This software comes with ABSOLUTELY NO WARRANTY. For details, see
// the enclosed file COPYING for license information (AGPL). If you
// did not receive this file, see http://www.gnu.org/licenses/agpl.txt.
// --

"use strict";

var Core = Core || {};
Core.UI = Core.UI || {};

/**
 * @namespace Core.UI.ActionRow
 * @memberof Core.UI
 * @author OTRS AG
 * @description
 *      Action row functionality.
 */
Core.UI.ActionRow = (function (TargetNS) {

    if (!Core.Debug.CheckDependency('Core.UI.ActionRow', 'Core.JSON', 'JSON API')) {
        return false;
    }
    if (!Core.Debug.CheckDependency('Core.UI.ActionRow', 'Core.Data', 'Data API')) {
        return false;
    }

    /**
     * @private
     * @name TicketElementSelectors
     * @memberof Core.UI.ActionRow
     * @member {Object}
     * @description
     *      The ticket element selectors for the different overviews.
     */
    var TicketElementSelectors = {
            'Small': 'div.Overview table td input[type="checkbox"][name=TicketID]',
            'Medium': 'ul.Overview input[type="checkbox"][name=TicketID]',
            'Large': 'ul.Overview input[type="checkbox"][name=TicketID]'
        },
    /**
     * @private
     * @name TicketView
     * @memberof Core.UI.ActionRow
     * @member {Object}
     * @description
     *      The active ticket view.
     */
        TicketView;

    /**
     * @private
     * @name SerializeData
     * @memberof Core.UI.ActionRow
     * @function
     * @returns {String} Query string of the data.
     * @param {Object} Data - The data that should be converted.
     * @description
     *      Converts a given hash into a query string.
     */
    function SerializeData(Data) {
        var QueryString = '';
        $.each(Data, function (Key, Value) {
            QueryString += ';' + encodeURIComponent(Key) + '=' + encodeURIComponent(Value);
        });
        return QueryString;
    }

    /**
     * @name AddActions
     * @memberof Core.UI.ActionRow
     * @function
     * @param {jQueryObject} $Element - The element for which the data is stored.
     * @param {String} JSONString - The JSON string which contains the information about the valid actions of the element (generated by Perl module).
     *      Could also be an javascript object directly.
     * @description
     *      This functions adds information about the valid action of an element to the element.
     *      These information are used to generate the action row individually for this element.
     */
    TargetNS.AddActions = function ($Element, JSONString) {
        var Actions;
        // The element of the given ID must exist, JSONString must not be empty
        if (isJQueryObject($Element)) {
            if (typeof JSONString === 'string') {
                Actions = Core.JSON.Parse(JSONString);
            }
            else {
                Actions = JSONString;
            }

            // save action data to the given element
            Core.Data.Set($Element, 'Actions', Actions);
        }
        else {
            Core.Debug.Log('Element does not exist or no valid data structure passed.');
        }
    };

    /**
     * @name UpdateActionRow
     * @memberof Core.UI.ActionRow
     * @function
     * @param {jQueryObject} $ClickedElement - jQueryObject of the clicked element (normally $(this)).
     * @param {jQueryObject} $Checkboxes - jQueryObject of the checkboxes of the different tickets.
     * @param {jQueryObject} $ActionRow - The jQueryObject of the ActionRow wrapper (normally the <ul>-Element).
     * @description
     *      This function is called on click on the checkbox of an ticket element and updates the action row for this element.
     */
    TargetNS.UpdateActionRow = function ($ClickedElement, $Checkboxes, $ActionRow) {
        var TicketActionData,
            ActionRowElement;

        // Check, if one or more items are selected
        $Checkboxes = $Checkboxes.filter(':checked');
        // No checkbox is selected
        if (!$Checkboxes.length) {
            // Remove actions and deactivate bulk action
            $ActionRow
                .find('li').filter(':not(.AlwaysPresent)').remove()
                .end().end()
                .find('#BulkAction').addClass('Inactive')
                .end()
                .find('li.Last').removeClass('Last')
                .end()
                .find('li:last').addClass('Last');
        }
        // Exactly one checkbox is selected
        else if ($Checkboxes.length === 1 && !$('#SelectAllTickets').is(':checked') ) {
            // Update actions and activate bulk action
            $ActionRow.find('#BulkAction').removeClass('Inactive');

            // Find the element which is active (it must not be the clicked element!)
            // and get the data
            TicketActionData = Core.Data.Get($Checkboxes.closest('li, tr'), 'Actions');
            if (typeof TicketActionData !== 'undefined') {
                $.each(TicketActionData, function (Index, Value) {
                    if (Value.HTML) {
                        $(Value.HTML).attr('id', Value.ID).appendTo($ActionRow);
                        ActionRowElement = $ActionRow.find('#' + Value.ID).find('a');
                        if (typeof Value.Target === 'undefined' || Value.Target === "") {
                            ActionRowElement.attr('href', Value.Link);
                        }
                        if (Value.PopupType) {
                            ActionRowElement.bind('click.Popup', function () {
                                Core.UI.Popup.OpenPopup(Value.Link, Value.PopupType);
                                return false;
                            });
                        }
                    }
                });
            }

            // Apply the Last class to the right element
            $ActionRow
                .find('li.Last').removeClass('Last')
                .end()
                .find('li:last').addClass('Last');
        }
        // Two ore more checkboxes selected
        else {
            // Remove actions and activate bulk action
            $ActionRow
                .find('li').filter(':not(.AlwaysPresent)').remove()
                .end().end()
                .find('#BulkAction').removeClass('Inactive')
                .end()
                .find('li.Last').removeClass('Last')
                .end()
                .find('li:last').addClass('Last');
        }
    };

    /**
     * @name Init
     * @memberof Core.UI.ActionRow
     * @function
     * @description
     *      This function initializes the complete ActionRow functionality and binds all click events.
     */
    TargetNS.Init = function () {
        // Get used ticket view mode
        if ($('#TicketOverviewMedium').length) {
            TicketView = 'Medium';
        }
        else if ($('#TicketOverviewLarge').length) {
            TicketView = 'Large';
        }
        else {
            TicketView = 'Small';
        }

        $('#SelectAllTickets').bind('click', function () {
            var Status = $(this).prop('checked');
            $(TicketElementSelectors[TicketView]).prop('checked', Status).triggerHandler('click');
        });

        $(TicketElementSelectors[TicketView]).bind('click', function (Event) {
            Event.stopPropagation();
            Core.UI.ActionRow.UpdateActionRow($(this), $(TicketElementSelectors[TicketView]), $('div.OverviewActions ul.Actions'));
        });

        $('#BulkAction a').bind('click', function () {
            var $Element = $(this),
                $SelectedTickets,
                TicketIDParameter = "TicketID=",
                TicketIDs = "",
                URL;
            if ($Element.parent('li').hasClass('Inactive')) {
                return false;
            }
            else {
                $SelectedTickets = $(TicketElementSelectors[TicketView] + ':checked');
                $SelectedTickets.each(function () {
                    TicketIDs += TicketIDParameter + $(this).val() + ";";
                });
                URL = Core.Config.Get('Baselink') + "Action=AgentTicketBulk;" + TicketIDs;
                URL += SerializeData(Core.App.GetSessionInformation());
                Core.UI.Popup.OpenPopup(URL, 'TicketAction');
            }
            return false;
        });
    };

    return TargetNS;
}(Core.UI.ActionRow || {}));
