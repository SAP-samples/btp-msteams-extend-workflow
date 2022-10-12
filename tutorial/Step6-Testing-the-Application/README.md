## Test the application

Now that you have successfully deployed the extension application to SAP BTP and uploaded the application manifest file in Microsoft Teams Admin Center, let us go ahead and test the application.

1. Log in to SAP BTP Cockpit and check your application. It should be in started state.
![plot](./images/appstarted.png)

2. Log in to Microsoft Teams as a manager (a user who has access to approve PR).

    Install the custom app by following the below steps.

    ![plot](./images/installapp.png)

    Select the application and add the application.

    ![plot](./images/addapp.png)

    Once the app has been added, you should be able to see the below in your MS Teams with the below Welcome message.

    ![plot](./images/launch.png)   

3. Login to your SAP S/4HANA as the business user (not the manager) and create a Purchase Requisition.
Note: This business user creates the PR and the manager approves/rejects the PR.

4. You will receive the notification for PR Approval as shown below in MS Teams.

    ![plot](./images/prcreate.png)  

5. Check the details and click on the respective Approve/Reject button to Approve/Reject PR. Once the PR is approved, the status is updated, as shown below.

    ![plot](./images/approved.png)  

Congratulations! You have completed the end-to-end integration of Microsoft Teams with SAP BTP and SAP S/4HANA.

### Troubleshooting

1. To access MS Teams admin URL, make sure the test user has Teams Administrator Role Assignment. This is also required to upload the application in MS Teams Admin console.

2. Add Microsoft Teams Exploratory license to the test user, especially the Exchange Online (Plan 1) License without which some resources like https://graph.microsoft.com/v1.0/me/calendar will not be available with graph api. 

3. In SAP S/4HANA on-premise system, before importing the ABAP Project (Open SE38 and execute the program ZABAPGIT_STANDALONE) and add a step to import GitHub certificate as mentioned here. Otherwise, you will encounter SSL certificate errors. 

4. In SAP S/4HANA 2020 and higher versions, the Clone Repository is not present in Abap Git program. On creating the online repository, a local copy is created automatically. So, the Clone Online Repo step can be avoided in these systems and Pull step can be executed directly. 

5. In case of Unauthorized error in Webhook, make sure that the role created by uaa instance is added to the Role Collection mapped in the Trust config. If this also does not solve the Issue the Role Collection should be added to the user. 

6. In case of Unauthorized error in destination configuration, Principal Type can be changed to X.509 Certificate (Strict Usage) in cloud configuration. 

7. In the Azure BOT Service, make sure to pass all the scopes while adding the Graph Connection to prevent issue of 403-Forbidden Error. When we test the connection, we have to test with Test User and provide all the permissions for the user.

