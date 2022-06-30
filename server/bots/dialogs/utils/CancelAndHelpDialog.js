/**
 * CancelAndHelpDialog.js provides an extended class based on the ComponentDialog class
 * Based on the sample code provided by Microsoft in https://github.com/microsoft/BotBuilder-Samples/tree/main/samples/javascript_nodejs/13.core-bot/dialogs
 * 
 * The CancelAndHelpDialog allows the bot to offer additional features to interrupt a user conversation
 * If the user for example needs help in using the bot, he can just type "help" and get some information without the need to end the current dialog
 * Furthermore a user can cancel the current dialog and return to the superior dialog like in this case the Main Dialog 
 *  
 */

import { InputHints, ActivityTypes } from 'botbuilder'
import { ComponentDialog, DialogTurnStatus } from 'botbuilder-dialogs'

class CancelAndHelpDialog extends ComponentDialog {
    constructor(id) {
        super(id);
    }

    async onComputeId(){
        var id = await super.onComputeId();
        return id;
    }

    /** 
     * Before the dialog continues, the bot checks if one of the
     * interruption words was typed by the user (help, ?, cancel, quit, logout)
     * In this case, the respective interruption message is displayed, the dialog
     * is ended or the user is being log out from the OAuth connections
     */
    async onContinueDialog(innerDc) {
        const result = await this.interrupt(innerDc);
        if (result) {
            return result;
        }

        return await super.onContinueDialog(innerDc);
    }

    // Handler for the different interruption scenarios 
    async interrupt(innerDc) {
        if (innerDc.context.activity.text) {
            const text = innerDc.context.activity.text.toLowerCase();

            switch (text) {
                // User requires help for the current dialog
                case 'help':
                case '?': {
                    const helpMessageText = 'Show help here';
                    await innerDc.context.sendActivity(helpMessageText, helpMessageText, InputHints.ExpectingInput);
                    return { status: DialogTurnStatus.waiting };
                }
                // User wants to cancel the current dialog and return to the superior dialog 
                case 'cancel':
                case 'quit': {

                    const cancelMessageText = '...Cancelling...';
                    await innerDc.context.sendActivity(cancelMessageText, cancelMessageText, InputHints.IgnoringInput);
                    
                    // Show typing indicator 
                    await innerDc.context.sendActivity({ type : ActivityTypes.Typing });
                    
                    // Short delay
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    return await innerDc.cancelAllDialogs();
                }
                // User wants to logout from the OAuth connections (BTP and Graph)
                case 'logout': {
                    const botAdapter = innerDc.context.adapter;
                    await botAdapter.signOutUser(innerDc.context, process.env.CONNECTION_NAME_GRAPH);
                    await botAdapter.signOutUser(innerDc.context, process.env.CONNECTION_NAME_BTP);
                    await innerDc.context.sendActivity('You have been signed out.');

                    return await innerDc.cancelAllDialogs();
                }
            }
        }
    }
}

export default CancelAndHelpDialog
