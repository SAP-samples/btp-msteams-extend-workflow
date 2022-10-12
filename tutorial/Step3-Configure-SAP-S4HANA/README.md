## Configure SAP S/4HANA for business scenario
In this section, you will configure the purchase requisition flexible workflow and create a background job.This background job will read all the generated workflow instances and sends them to the SAP Event Mesh.

### Prerequisites
Moderate knowledge of SAP ABAP, assigning user roles & navigating through SAP.

### Flexible Workflow Activation
In this step, you will create a flexible workflow, which will send a request(Workflow instance/Workitem) to an approver when you create a purchase requisition with a net amount greater than or equal to 500 USD in your SAP S/4HANA system.

>Note: This step is optional if you already have an existing workflow running in your SAP S/4HANA system. Ensure that you deactivate other workflows before creating and activating this new workflow.

1. Open the Fiori application - **Manage Workflow for purchase requisitions**.<br>
    >Note: Ensure the Role - SAP_BR_BPC_EXPERT is assigned to the user to have the above application accessible.<br>
    **Help**: [Manage Workflow for Purchase Requisitions](https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/#/detail/Apps('F2705')/S20OP)

2. Select **Release of Purchase Requisition Item** as the workflow type.<br>
![WorkflowType](./images/s4/1.png)

3. Click **Add** to add a new workflow.<br>
![Add a New Workflow](./images/s4/2.png)

4. Provide a unique name to the workflow.<br>
![name of workflow](./images/s4/3.png)

5. Select **Net amount is equal to or greater than** as the condition and **500 USD** as the amount.<br>
![condition](images/s4/4.png)
    >Note: This step ensures that this workflow will be triggered only if the **Net Amount** of the Purchase Requisition is greater than or equal to **500 USD**.

6. Add the approval step by clicking the **Add** button in the **Step Sequence** section.<br>
![Approval Add step](images/s4/5.png)

7. Select the step type **Release of purchase requisition Item** from the dropdown.<br>
![Step type Approval](images/s4/6.png)

8. Go to the **Recipients** section, select the dropdown value **User** for **Assignment By**, and provide the user id in the **User** field. <br> 
Please Note: This user id needs to have the same email address of the test user that is created in Azure AD. Go to user administrator in SAP S/4HANA and update the user's email address.
![User Assignment](./images/s4/7.png)
    >Note: In this step, you will select which user the workflow should go to for approval.

9. Click the **Add** button to save this step. The page will automatically navigate to the previous page.<br>
![Save the step](./images/s4/8.png)

10. Click **Save** to save the workflow.<br>
![Save the Workflow](./images/s4/9.png)

11. Click **Activate** this workflow.<br>
![Activate](./images/s4/10.png)

You have now successfully created and activated the new Flexible Workflow.

### Test purchase requisition creation workflow
In this step, you will create a purchase requisition and check if the workflow is created in your SAP S/4HANA system

12. Open the Fiori application - **Manage Purchase Requisition Professional**.<br>
    >Note: Enure the Role - SAP_BR_PURCHASER is assigned to the User to have the above application accessible.<br>
    [**SAP Help - Manage Purchase Requisition Professional**](https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/#/detail/Apps('F2229')/S22OP)

13. Click **Create** button to create a new Purchase Requisition.<br>
![create pr](./images/s4/31.png)

14. Add an item with the net amount greater than or equal to 500 USD and click **Create** to create the purchase requisition.<br>
![create pr](./images/s4/32.png)

15. Open transaction **SWIA** and execute the transaction with shortcut F8(Function 8 key), which will show the newly created workitem in the list with the type **Dialog Step**. Note down the **Task**, which you will use in the upcoming steps.<br>
![workitem pr](./images/s4/33.png)

16. (Optional) You can also open the My Inbox Fiori application for the User configured in **Step 8** to see the workflow instance sent to the User's inbox for approval.<br>

You have successfully created a purchase requisition, which created a workflow instance and sent it for approval.

### Background Job to send the Workflow Instances to the SAP Event Mesh

In this step, you will create the background job to send the workflow instances(workitems) to the SAP Event Mesh. After this step, the configured webhook in SAP Event Mesh will forward the workitems to the MS Teams application for approval.


#### <ins>Create the service key for your SAP Event Mesh<ins>
In this sub-step, you will create a service key for your SAP Event Mesh instance, which has the OAuth client credentials and the rest service URL to communicate with the SAP Event Mesh.

17. Go to your SAP BTP subaccount and select **Instances and Subscriptions**.<br>
![Ins & Subs](./images/s4/11.png)

18. Click the **Three dot Button** to open the menu and click **Create Service Key** to create the service key.<br>
![Ins & Subs](./images/s4/12.png)

19. Provide a name and click **Create** to create the service key.<br>
![Ins & Subs](./images/s4/13.png)

20. Click **View** to open the **Service Key**.<br>
![View Service Key](./images/s4/14.png)

21. Scroll down to the **httprest** protocol and note down the **Clientid**, **Clientsecret**, **tokenendpoint** and **uri**, which you will use in the upcoming steps.<br>
![Note the service key details](./images/s4/15.png)

#### <ins>Create the Destination<ins>
In this sub-step, you will create a destination to maintain the rest URL of the SAP Event Mesh to connect and send messages.

22. Goto **SM59** transaction and click **create** icon as shown in the below screenshot to create a new destination.<br>
![Destination](./images/s4/16.png)

23. Provide a unique name for the destination and select the **Connection Type** as **G HTTP Connection to external server**.<br>
![Destination](./images/s4/17.png)

25. Copy the **uri** from **Step 21** and paste it in **Host** input box and use **443** as the port.<br>
![Destination](./images/s4/18.png)
    >Note: Host should not have **https** while pasting in the **uri**

26. Select the **Active** radio button for **SSL** in the section **Logon & Security** and **SSL Client(Anonymous)** in **SSL Certificate** and click **Save**.<br>
![Destination](./images/s4/19.png)

27. Click **Connection Test** to check if the connection to SAP Event Mesh is established successfully.<br>
![Connection Button](./images/s4/20.png)
![Connection Result](./images/s4/21.png)

#### <ins>Configure the oauth profile<ins>
In this sub-step, you will configure the OAuth client, which will be used by the destination from **Step 22** to connect to SAP Event Mesh.<br>

28. Open transaction **OA2C_CONFIG**, which will open a web application in your browser, and click **Create** to create an OAuth client.<br>
![OAuth Create](./images/s4/22.png)

29. Select the drop down value **/IWXBE/MGW_MQTT** in the field **OAuth 2.0 Client Profile**, enter a unique name in the **Configuration Name** and **OAuth 2.0 Client ID** value from **Step 21** : **Clientid**.<br>
![OAuth Client Details](./images/s4/23.png)

30. Scroll down and enter **clientsecret** and **tokenendpoint** from **Step 21**. For "Authorization endpoint" value, take the token endpoint, remove /token and instead add /authorize. Eg: customlogicaa-54uuyxjv.authentication.eu12.hana.ondemand.com/oauth/authorize <br>
![Additiona details](./images/s4/24.png)

31. Select the radio buttons **Form Fields**, **Header Field** and **Client Credentials** as shown in the screenshot.<br>
![Additiona details](./images/s4/25.png)

32. **Save** it.<br>
![Save OAuth](./images/s4/26.png)

#### <ins>Import ABAP Git Project to run<ins>
Use the GitHub [ABAP Branch URL ](https://github.com/SAP-samples/btp-msteams-extend-workflow/tree/abap) to import the ABAP Class and Report, which contains the code to send the Workflow instances(workitems) to SAP Event Mesh.

33. Open **SE38** and execute the program **ZABAPGIT_STANDALONE**.<br>
    >Note: If the above program is not there in the system, follow the [Install ABAP Git](https://docs.abapgit.org/guide-install.html) documentation.
    

34. Click **New Online** button to import the repository.<br>
![Import Repo](./images/s4/28.png)

35. Enter the repository url as "https://github.com/SAP-samples/btp-msteams-extend-workflow/", package & branch as **abap** and click **Create Online Repo** to import the repository.<br>
![Repo details](./images/s4/29.png)

36. Select **Clone Online Repo** and click **pull** to save the repo to your SAP S/4HANA system.<br>
    >Note: For more information, please follow the official [ABAP Git tutorial](https://docs.abapgit.org/guide-online-install.html)
    

#### <ins>Understanding the Code<ins>
Now that you have imported the code to push the workitems to the SAP Event Mesh. Let's understand how it works.

37. After completing the **Step 36**, you will have a report **ZWFCUSEMSEND_TEAMSINT** and a class **zcl_wfcusemsend_teamsint** created in your SAP S/4HANA system.<br>

38. Report: **ZWFCUSEMSEND_TEAMSINT** will run and execute the class **zcl_wfcusemsend_teamsint** method **RUN_EM_JOB**. The last 1-minute timestamp will be sent as the importing parameter to the method **RUN_EM_JOB**, which will be used to fetch the workitems that were created in the last 1 minute of the report's execution( called from the background job, which is described in the upcoming steps).<br>
![Report](./images/s4/30.png)

39. Inside the method: **RUN_EM_JOB**, the private method: **GET_DELTA_WORKFLOW_INSTANCES** will be called to fetch all the workflow instances (workitems) that were created. The task **TS02000714** is from **Step 15**.<br>
![Task Fetch](./images/s4/34.png)

40. After the execution of the method: **GET_DELTA_WORKFLOW_INSTANCES**, the method: **CONNECT_TO_EM** will create the HTTP connection instance to the SAP Event Mesh, which is well explained using the comments in the code.<br>
![Execution](./images/s4/36.png)
You will also maintain the URI for the SAP Event Mesh in the **CONNECT_TO_EM** method as explained below:<br>

    In case of the SAP BTP trial account with SAP Event Mesh default plan, then 
    the URI value should be entered as 'URI value that should be used is '/messagingrest/v1/queues/PRApproval/messages'.

    In case of the SAP BTP enterprise account with SAP Event Mesh standard plan, if the namespace is "orgname/s4/t1" for your SAP Event Mesh instance and queue name is "PRApproval"(the queue name should be same as the one that you have entered in [### 2.Setup SAP Event Mesh](../Step1-Configure-SAP-BTP/README.md) step, then 

    URI - '/messagingrest/v1/queues/<encoded fully qualified queue name>/messages'
    Fully qualified queue name - orgname/s4/t1/PRApproval
    Encoded FQQN - orgname%2Fs4%2Ft1%2FPRApproval

    URI value that should be used is '/messagingrest/v1/queues/orgname%2Fs4%2Ft1%2FPRApproval/messages'

    ![Execution](./images/s4/52.png)

    Save and activate the object before proceeding.

41. Then the **SEND_WORKITEM_TO_EM** method will send the Purchase Requisition workitem to the Event Mesh.<br>
![Constructor](./images/s4/35.png)
    >**Note**: The Destination, OAuth Profile & OAuth Configuration are maintained in the **Contructor** method.

#### <ins>Background Job Creation<ins>
In this step, you will automate the report from **Step 37** to run in the background every minute to send the newly created workitems to the SAP Event Mesh.

42. Open the Transaction **SM36** and click **Job Wizard** to create a new background job.<br>
![SM36](./images/s4/37.png)

43. Click **Continue**.<br>
![SM36 Step 2](./images/s4/38.png)

44. Enter a unique name in **Job Name** input box and click **Continue**.<br>
![SM36 Step 3](./images/s4/39.png)

45. Select **ABAP Program Step** and click **Continue**.<br>
![SM36 Step 4](./images/s4/40.png)

46. Enter the report name from **Step 37** and click **Continue**.<br>
![SM36 Step 5](./images/s4/41.png)

47. click **Continue**.<br>
![SM36 Step 6](./images/s4/42.png)

48. Select the radio button **Immediately** and click **Continue**.<br>
![SM36 Step 7](./images/s4/43.png)

49. Select the check box **Period** as show in the screenshot.<br>
![SM36 Step 8](./images/s4/44.png)

50. Now select **None of the above** and click **Other Periods** button.<br>
![SM36 Step 9](./images/s4/45.png)

51. Enter **1** in **Minute(s)** input box, so the background job will run for every 1 minute and click **Create** and then click **Continue**.<br>
![SM36 Step 10](./images/s4/46.png)

52. Click **Complete** to schedule the background job.<br>
![SM36 Step 11](./images/s4/47.png)

You have now completed the creation of the background job that will send the newly created workitems to the Event Mesh every 1 minute.

### Testing: From Creation of PR to verifying the message in SAP Event Mesh
Let's create a new purchase requisition and go to SAP Event Mesh to see the message details.

53. Repeat the **Steps 12 - 14** to create a new purchase requisition and initiate a new approval workflow. The background job will send the workitem information to SAP Event Mesh Queue in a minute.

54. Open the SAP Event Mesh application from your subaccount.<br>
![Message Client](./images/s4/48.png)

55. Go to the Message Client you have created and go to the **Test** tab to consume the message.<br>
![Message Client](./images/s4/49.png)

56. Select your Queue from the dropdown to see the messages sent to Queue.<br>
![Queue](./images/s4/50.png)

57. Click on **Consume** to see the message.<br>
![Consume](./images/s4/51.png)

### Activate the service API_PURCHASEREQ_PROCESS_SRV

58. Add the service API_PURCHASEREQ_PROCESS_SRV with the /n/IWFND/MAINT_SERVICE transaction.<br>
![Activate](./images/s4/53.png)

Congratulations!! Now you have completed the creation of the new Flexible workflow for the purchase requisition, configured the background job to send the workitems to SAP Event Mesh, and tested it successfully.