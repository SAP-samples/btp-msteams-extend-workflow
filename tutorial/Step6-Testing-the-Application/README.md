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