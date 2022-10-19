## Test the application

Now that you have successfully deployed the extension application to SAP BTP and uploaded the application manifest file in Microsoft Teams Admin Center, follow the below steps to test the application.

1. Log in to SAP BTP cockpit, navigate to your subaccount and choose **Cloud Foundry** > **Spaces** and select the space.

2. You will see the deployed application under **Application**. Choose the application to view the details. It should be in **Started** state as shown in the screenshot.
![plot](./images/appstarted.png)

3. Log in to [Microsoft Teams](https://teams.microsoft.com) as a manager (a user who is configured with authorization to approve purchase requisition).

4. In Microsoft Teams, choose **Apps** > **Built for your org**. You will be able to see the application in the detail page. In case you do not see this application, check your deployment of your manifest file in Microsoft Teams Admin Center.

    ![plot](./images/installapp.png)

5. Select the application and **Add** the application.

    ![plot](./images/addapp.png)

6.  Once the app has been added, you should be able to see the below in your Microsoft Teams with the below welcome message.

    ![plot](./images/launch.png)   

7. Log in to SAP S/4HANA as the business user (not the manager) and create a purchase requisition.

    **Note**: This business user creates the purchase requisition and the manager approves/rejects the purchase requisition.

8. You will receive the notification for purchase requisition approval as shown in screenshot in MS Teams.

    ![plot](./images/prcreate.png)  

9. Check the details and click on the respective Approve/Reject button to Approve/Reject PR. Once the PR is approved, the status is updated, as shown below.

    ![plot](./images/approved.png)  

Congratulations! You have completed the end-to-end integration of Microsoft Teams with SAP BTP and SAP S/4HANA.

### Troubleshooting

1. To access MS Teams admin URL, make sure the test user has Teams Administrator Role Assignment. This is also required to upload the application in MS Teams Admin console.

2. Add Microsoft Teams Exploratory license to the test user, especially the Exchange Online (Plan 1) License without which some resources like https://graph.microsoft.com/v1.0/me/calendar will not be available with Microsoft Graph API. 

3. Ensure you import GitHub certificate by following [abapGit documentation](https://docs.abapgit.org/guide-ssl-setup.html) before executing Step 33 in [Step3-Configure-SAP-S4HANA](../Step3-Configure-SAP-S4HANA/README.md) to avoid SSL certificate errors.

4. In SAP S/4HANA 2020 and higher versions, the Clone Repository is not present in Abap Git program. On creating the online repository, a local copy is created automatically. Hence, the Clone Online Repo step can be avoided in these systems and Pull step can be executed directly. 

5. In case of Unauthorized error in webhook, make sure that the role created by uaa instance is added to the Role Collection mapped in the Trust config. If this does not solve the isue the Role Collection should be added manually to the user. 

6. In case of Unauthorized error in destination configuration, Principal Type can be changed to X.509 Certificate (Strict Usage) in cloud configuration. 

7. In the Azure Bot Service, make sure to pass all the scopes while adding the Graph Connection to prevent issue of 403-Forbidden Error. When we test the connection, we have to test with Test User and provide all the permissions for the user.

