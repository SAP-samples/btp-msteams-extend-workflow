/**
 * adaptiveCards.js returns the adaptive cards used by the bot, the messaging extension and the tab component
 *  
 * All adaptive cards returned here are based on the input data provided to the function
 * For some cards, depending on a boolean value, certain parts like profile picture and name are not included
 * Same principle applies to action buttons which are hidden in certain cases. 
 * 
 * For most cards, the cardData object and included objects like graphData and dataStore are attached
 * to serve as collector for required information across multiple consecutive adaptive cards. This way 
 * static information like Graph profile data doesn't need to be requested again and again. 
 * 
 */

// General Cards
// Welcome card when user uses the extension application for the very first time
const welcomeCard = function(){
    return {
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "type": "AdaptiveCard",
        "version": "1.0",
        "body": [
            {
            "type": "TextBlock",
            "spacing": "medium",
            "size": "default",
            "weight": "bolder",
            "text": "Welcome to SAP S/4HANA Business Events Bot!",
            "wrap": true,
            "maxLines": 0
            },
            {
            "type": "TextBlock",
            "size": "default",
            "isSubtle": true,
            "text": 'Using this Bot, you can get notifications on Purchase Requisitions pending for approval to Approve/Reject.',
            "wrap": true,
            "maxLines": 0
            }
        ]
    }

}

// Card when user runs the Logout messaging extension feature
const signedOutCard = function() {
    return {
        version: '1.0.0',
        type: 'AdaptiveCard',
        body: [
            {
                type: 'TextBlock',
                text: 'You have been signed out.'
            }
        ],
        actions: [
            {
                type: 'Action.Submit',
                title: 'Close',
                data: {
                    key: 'close'
                }
            }
        ]
    }
}


const PurchaseRequisitionCard = function(cardData, approvalStatus) {

    let actions =  [{
        type: "Action.Submit",
        title: "Approve Request",
        data: {
            msteams: {
                "type": "messageBack",
                "text": "Approve"
            },
            origin: 'PurchaseRequisitionCard',
            action: 'approve',
            dataStore : cardData
        }
        },{
            type: "Action.Submit",
            title: "Reject Request",
            data: {
                msteams: {
                    "type": "messageBack",
                    "text": "Reject"
                },
                origin: 'PurchaseRequisitionCard',
                action: 'reject',
                dataStore : cardData
            }
        }
    ];

    let card ={
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.2',
            body: [
                {
                    type: "TextBlock",
                    text: `Purchase Requisition - ${cardData.PurchaseRequisition} has been created.`,
                    weight: 'Bolder',
                    size: 'Medium',
                },
                {
                    type: "TextBlock",
                    text: `Description - ${cardData.PurReqnDescription}`
                },
                {
                    type: "TextBlock",
                    text: `Type - ${cardData.PurchaseRequisitionType}`
                },
               
                {
                    type: "FactSet",
                    facts:  cardData.to_PurchaseReqnItem.results.map((result) => {
                        return {
                            title: result.PurchaseRequisitionItemText,
                            value: result.ItemNetAmount
                        }
                    })
                },
                {
                    type: 'TextBlock',
                    text: '**Approved**',
                    wrap: true,
                    weight: 'Bolder',
                    size: 'Large',
                    color: 'Good',
                    isVisible : approvalStatus === 'approve' ? true : false 
                },
                {
                    type: 'TextBlock',
                    text: '**Rejected**',
                    wrap: true,
                    weight: 'Bolder',
                    size: 'Medium',
                    color: 'Attention',
                    isVisible : approvalStatus === 'reject' ? true : false 
                }
            ],

            actions: approvalStatus ? [] : actions
        }
    }

    return card;
}

export {
    welcomeCard,
    signedOutCard,
    PurchaseRequisitionCard
}
