/**
 * HTQ 2026 — Upload IDs Handler
 * 
 * Called by doPost() in Code.gs — does NOT define its own doPost/doGet.
 * Saves receipt images to Google Drive and stores the link in the sheet.
 */

function handleUploadIds(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ---- Look up Team ID in Registrations ----
  var regSheet = ss.getSheetByName("Registrations");
  var teamName = "Unknown Team";
  var teamFound = false;

  if (regSheet && regSheet.getLastRow() > 1) {
    var regData = regSheet.getRange("B2:C" + regSheet.getLastRow()).getValues();
    for (var r = 0; r < regData.length; r++) {
      if (regData[r][0] === data.teamId) {
        teamName = regData[r][1];
        teamFound = true;
        break;
      }
    }
  }

  if (!teamFound) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "error",
        message: "Team ID not found. Please register first."
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ---- Get or create UploadedIDs sheet ----
  var sheet = ss.getSheetByName("UploadedIDs");
  if (!sheet) {
    sheet = ss.insertSheet("UploadedIDs");
    sheet.appendRow([
      "Timestamp", "Team ID", "Team Name",
      "Team Size", "Members Info", "Payment Receipt"
    ]);
    sheet.getRange("1:1").setFontWeight("bold");
  }

  // ---- Format members info ----
  var membersInfo = "";
  for (var i = 0; i < data.members.length; i++) {
    var m = data.members[i];
    membersInfo += "Member " + (i + 1) + ": " + m.name + " | ID: " + m.nationalId;
    if (i < data.members.length - 1) membersInfo += "\n";
  }

  // ---- Handle payment receipt — upload to Google Drive ----
  var receiptCell = "No receipt uploaded";

  if (data.paymentReceipt) {
    try {
      var base64Data = data.paymentReceipt.split(",")[1];
      var mimeType = data.paymentReceipt.match(/data:(.*?);/)[1];
      var extension = mimeType.split("/")[1] || "jpg";
      var fileName = data.teamId + "_" + teamName.replace(/[^a-zA-Z0-9]/g, "_") + "_receipt." + extension;

      var blob = Utilities.newBlob(
        Utilities.base64Decode(base64Data),
        mimeType,
        fileName
      );

      // Get or create the HTQ_Receipts folder
      var folders = DriveApp.getFoldersByName("HTQ_Receipts");
      var folder;
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder("HTQ_Receipts");
      }

      // Save the file to Drive
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      // Create a direct viewable link
      receiptCell = "https://drive.google.com/file/d/" + file.getId() + "/view?usp=sharing";

    } catch (imgError) {
      receiptCell = "Upload error: " + imgError.toString();
    }
  }

  // ---- Append the row ----
  sheet.appendRow([
    new Date().toLocaleString("en-GB", { timeZone: "Africa/Cairo" }),
    data.teamId,
    teamName,
    data.teamSize,
    membersInfo,
    receiptCell
  ]);

  sheet.autoResizeColumns(1, 6);

  return ContentService
    .createTextOutput(JSON.stringify({
      status: "success",
      message: "IDs uploaded successfully!"
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
