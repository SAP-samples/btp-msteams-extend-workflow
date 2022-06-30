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

// Leave Request Cards
// Leave Request Intro Card
const leaveRequestIntroCard = function(cardData, showProfile) {
    return {
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        version: '1.2',
        type: 'AdaptiveCard',
        body: [
            (showProfile ?? true) ? {
                type: "ColumnSet",
                columns: [
                    {
                        type: "Column",
                        width: "auto",
                        verticalContentAlignment: "Center",
                        items: [
                            {
                                type: "Image",
                                style: "Person",
                                size: "Small",
                                url: cardData.graphData.photo
                            }
                        ]
                    },
                    {
                        type: "Column",
                        width: "auto",
                        verticalContentAlignment: "Center",
                        items: [
                            {
                                type: "TextBlock",
                                text: cardData.graphData.profile.fullName
                            }
                        ]
                    }
                ]
            } : { "type": "Container" , items : []},
            {
                "type": "Container",
                "items": [
                    {
                        type: 'TextBlock',
                        wrap: true,
                        text: `This Microsoft Teams extension allows you to create a new Leave Request or to review existing Leave Requests.`
                    }
                ]
            }
        ],
        actions: [
            {
                data: {
                    graphData: cardData.graphData,
                    dataStore: cardData.dataStore,
                    action: 'create',
                    origin: 'leaveRequestIntroCard',
                    msteams: {
                        "type": "messageBack",
                        "text": "Create"
                    }
                },
                title: 'Create Leave Request',
                type: 'Action.Submit'
            }, {
                data: {
                    graphData: cardData.graphData,
                    dataStore: cardData.dataStore,
                    action: 'view',
                    origin: 'leaveRequestIntroCard',
                    msteams: {
                        "type": "messageBack",
                        "text": "View"
                    }
                },
                title: 'View Leave Requests',
                type: 'Action.Submit'
        }]
    }
}

// Leave Request Time Type Selection Card
const leaveRequestTimeTypesCard = function(cardData, showProfile) {
    return {
        "type": "AdaptiveCard",
        "body": [
            (showProfile ?? true) ? {
                type: "ColumnSet",
                columns: [
                    {
                        type: "Column",
                        width: "auto",
                        verticalContentAlignment: "Center",
                        items: [
                            {
                                type: "Image",
                                style: "Person",
                                size: "Small",
                                url:  cardData.graphData.photo
                            }
                        ]
                    },
                    {
                        type: "Column",
                        width: "auto",
                        verticalContentAlignment: "Center",
                        items: [
                            {
                                type: "TextBlock",
                                text: cardData.graphData.profile.fullName
                            }
                        ]
                    }
                ]
            } : { "type": "Container" , items : []},
            {
                "type": "TextBlock",
                "text": `${cardData.description}`,
                "wrap": true
            },
            {
                "type": "Input.ChoiceSet",
                "id": "Input.TimeType",
                "style": "expanded",
                "placeholder": "Select Leave Type",
                "choices": cardData.timeTypes.map((timeType) => {
                    return {
                        title: timeType.typeText,
                        value: timeType.typeId
                    }
                })
            }
        ],
        "actions": [
            {
                type: 'Action.Submit',
                title: 'Continue',
                data: {
                    graphData: cardData.graphData,
                    dataStore: cardData.dataStore,
                    action: 'create',
                    origin: 'leaveRequestTimeTypesCard',
                    msteams: {
                        type: "messageBack",
                        text: "Continue"
                    },
                    replyToIds: cardData.replyToIds ? cardData.replyToIds : ''
                }
            },
            {
                type: "Action.Submit",
                title: "Cancel",
                style: "destructive",
                data: {
                    action: 'cancel',
                    origin: 'leaveRequestTimeTypesCard',
                    msteams: {
                        type: "messageBack",
                        text: "Cancel"
                    },
                    replyToIds: cardData.replyToIds ? cardData.replyToIds : ''
                }
            }
        ],
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "version": "1.3"
    }
}

//// Leave Request Detail Card
const leaveRequestFormCard = function(cardData, showProfile) {
    return {
        "type": "AdaptiveCard",
        "body": [
            (showProfile ?? true) ? {
                type: "ColumnSet",
                columns: [
                    {
                        type: "Column",
                        width: "auto",
                        verticalContentAlignment: "Center",
                        items: [
                            {
                                type: "Image",
                                style: "Person",
                                size: "Small",
                                url: cardData.graphData.photo
                            }
                        ]
                    },
                    {
                        type: "Column",
                        width: "auto",
                        verticalContentAlignment: "Center",
                        items: [
                            {
                                type: "TextBlock",
                                text: cardData.graphData.profile.fullName
                            }
                        ]
                    }
                ]
            } : { "type": "Container" , items : []},
            {
                "type": "TextBlock",
                "text": `${cardData.description}`,
                "wrap": true
            },
            {
                "type": "TextBlock",
                "text": "Leave Type",
                "weight": "bolder",
                "id": "Text.LeaveType"
            },
            {
                "type": "TextBlock",
                "text": `${cardData.dataStore.timeType}`,
                "wrap": true
            },
            {
                "type": "TextBlock",
                "text": "Balance",
                "weight": "bolder",
                "id": "Text.Balance"
            },
            cardData.timeBalance[0].value === 'unlimited' ? 
                {
                    "type": "TextBlock",
                    "text": `${cardData.timeBalance[0].title}`
                }
            :
                {
                    "type": "FactSet",
                    "facts": cardData.timeBalance.map((balance) => {
                        return {
                            title: balance.title,
                            value: balance.value
                        }
                    })
                }
            ,{
                "type": "ColumnSet",
                "columns": [
                    {
                        "type": "Column",
                        "width": "stretch",
                        "items": [
                            {
                                "type": "TextBlock",
                                "text": "First leave day",
                                "weight": "bolder",
                                "wrap": true,
                                "id": "Text.StartDate"
                            },
                            {
                                "type": "Input.Date",
                                "id": "Input.StartDate"
                            }
                        ]
                    },
                    {
                        "type": "Column",
                        "width": "stretch",
                        "items": [
                            {
                                "type": "TextBlock",
                                "wrap": true,
                                "text": "Last leave day",
                                "weight": "bolder",
                                "id": "Text.EndDate"
                            },
                            {
                                "type": "Input.Date",
                                "id": "Input.EndDate"
                            }
                        ]
                    }
                ]
            },
            {
                "type": "TextBlock",
                "text": "Comment",
                "wrap": true,
                "weight": "bolder",
                "id": "Text.Comment"
            },
            {
                "type": "Input.Text",
                "placeholder": "Comment",
                "id": "Input.Comment",
                "isMultiline": true
            }
        ],
        actions: [
            {
                data: {
                    graphData: cardData.graphData,
                    dataStore: cardData.dataStore,
                    action: 'create',
                    origin: 'leaveRequestFormCard',
                    msteams: {
                        type: "messageBack",
                        text: "Continue"
                    },
                    replyToIds: cardData.replyToIds ? cardData.replyToIds : ''
                },
                title: 'Create Leave Request',
                type: 'Action.Submit'
            },
            {
                data: {
                    action: 'cancel',
                    origin: 'leaveRequestFormCard',
                    msteams: {
                        type: "messageBack",
                        text: "Cancel"
                    },
                    replyToIds: cardData.replyToIds ? cardData.replyToIds : ''
                },
                title: 'Cancel',
                type: 'Action.Submit'
            }
        ],
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "version": "1.3"
    }
}

// Leave Request Create Success Card
// Action buttons are not required for the bot so they can be hidden
const leaveRequestSuccessCard = function(cardData, showButton) {
    return {
        "type": "AdaptiveCard",
        "body": [
            {
                "type": "TextBlock",
                "text": `${cardData.description}`,
                "wrap": true
            },
            {
                "type": "TextBlock",
                "text": "Leave Type",
                "weight": "bolder",
                "id": "Text.LeaveType"
            },
            {
                "type": "TextBlock",
                "text": `${cardData.dataStore.timeType}`,
                "wrap": true
            },
            {
                "type": "TextBlock",
                "text": "Leave Time",
                "weight": "bolder",
                "id": "Text.LeaveTime"
            },
            {
                "type": "TextBlock",
                "text": `${cardData.dataStore.startDate} - ${cardData.dataStore.endDate}`,
                "wrap": true
            }
        ],
        actions: (showButton ?? true) ? [
            {
                data: {
                    action: 'return',
                    origin: 'leaveRequestSuccessCard'
                },
                title: 'Return',
                type: 'Action.Submit'
            } 
        ]: []
        ,
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "version": "1.3"
    }
}

// Leave Request Create Error Card
// Action buttons are not required for the bot so they can be hidden
const leaveRequestErrorCard = function(cardData, showButton) {
    return {
        "type": "AdaptiveCard",
        "body": [
            {
                "type": "TextBlock",
                "text": `${cardData.description}`,
                "wrap": true
            },
            {
                "type": "TextBlock",
                "text": "Leave Type",
                "weight": "bolder",
                "id": "Text.LeaveType"
            },
            {
                "type": "TextBlock",
                "text": `${cardData.dataStore.timeType}`,
                "wrap": true
            },
            {
                "type": "TextBlock",
                "text": "Leave Time",
                "weight": "bolder",
                "id": "Text.LeaveTime"
            },
            {
                "type": "TextBlock",
                "text": `${cardData.dataStore.startDate} - ${cardData.dataStore.endDate}`,
                "wrap": true
            },
            {
                "type": "TextBlock",
                "text": "Error",
                "weight": "bolder",
                "id": "Text.Error"
            },
            {
                "type": "TextBlock",
                "text": `${cardData.error}`,
                "wrap": true
            }
        ],
        actions: (showButton ?? true) ? [
            {
                data: {
                    action: 'return',
                    origin: 'leaveRequestErrorCard'
                },
                title: 'Return',
                type: 'Action.Submit'
            }
        ] : [],
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "version": "1.3"
    }
}

// Leave Request Notification Card
// This card will be updated once a manager approved or rejected a leave request
// In this case the approvalStatus will be filled, the content of the card is udpated
// and the available actions (reject/approve) are hidden
const leaveRequestNotificationCard = function(cardData, showProfile, approvalStatus) {    
    let actions =  [{
            type: "Action.Submit",
            title: "Approve Request",
            data: {
                msteams: {
                    type: "task/fetch"
                },
                origin: 'leaveRequest',
                action: 'approve',
                dataStore : cardData
            }
        },{
            type: "Action.Submit",
            title: "Reject Request",
            data: {
                msteams: {
                    type: "task/fetch"
                },
                origin: 'leaveRequest',
                action: 'reject',
                dataStore : cardData
            }
        }
    ];
    
    return {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.2',
            body: [
                {
                    type: 'TextBlock',
                    text: '**Leave Request Received**',
                    wrap: true,
                    weight: 'Bolder',
                    size: 'Medium',
                },
                (showProfile ?? true) ? {
                    type: "ColumnSet",
                    columns: [
                        {
                            type: "Column",
                            width: "auto",
                            verticalContentAlignment: "Center",
                            items: [
                                {
                                    type: "Image",
                                    style: "Person",
                                    size: "Small",
                                    url: cardData.senderPhoto
                                }
                            ]
                        },
                        {
                            type: "Column",
                            width: "auto",
                            verticalContentAlignment: "Center",
                            items: [
                                {
                                    type: "TextBlock",
                                    text: cardData.senderName
                                }
                            ]
                        }
                    ]
                } : { "type": "Container" , items : []},
                {
                    type: 'TextBlock',
                    text: '**' + cardData.senderName + '** created a Leave Request',
                    wrap: true,
                },
                {
                    type: "TextBlock",
                    text: "**Leave Type:**"
                },
                {
                    type: "TextBlock",
                    text: cardData.timeType
                },
                {
                    type: "TextBlock",
                    text: "**Absence:**"
                },
                {
                    type: "TextBlock",
                    text: cardData.startDate +  ' - ' + cardData.endDate
                },
                {
                    type: 'TextBlock',
                    text: '**Approved**',
                    wrap: true,
                    weight: 'Bolder',
                    size: 'Medium',
                    isVisible : approvalStatus === 'approve' ? true : false 
                },
                {
                    type: 'TextBlock',
                    text: '**Rejected**',
                    wrap: true,
                    weight: 'Bolder',
                    size: 'Medium',
                    isVisible : approvalStatus === 'reject' ? true : false 
                }
            ],
            actions: approvalStatus ? [] : actions
        }
    };
}

// Leave Request Update Notification Card
// Will be send to the user once the status of a leave request changes 
const leaveRequestUpdateNotificationCard = function(cardData) {      
    
    return {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.2',
            body: [
                {
                    type: 'TextBlock',
                    text: '**Leave Request Updated**',
                    wrap: true,
                    weight: 'Bolder',
                    size: 'Medium',
                },
                {
                    type: 'TextBlock',
                    text: 'Your Leave Request was updated. Please check the status!',
                    wrap: true,
                },
                {
                    type: "TextBlock",
                    text: "**Leave Type:** "
                },
                {
                    type: "TextBlock",
                    text: cardData.timeType
                },
                {
                    type: "TextBlock",
                    text: "**Absence:** "
                },
                {
                    type: "TextBlock",
                    text: cardData.startDate +  ' - ' + cardData.endDate
                },
                {
                    type: 'TextBlock',
                    text: "**Status:** ",
                    weight: 'Bolder',
                    size: 'Medium'
                },
                {
                    type: 'TextBlock',
                    text: cardData.status
                }
            ]
        }
    };
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
    leaveRequestIntroCard,
    leaveRequestTimeTypesCard,
    leaveRequestFormCard,
    leaveRequestSuccessCard,
    leaveRequestErrorCard,
    leaveRequestNotificationCard,
    leaveRequestUpdateNotificationCard,
    PurchaseRequisitionCard
}
