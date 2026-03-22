/**
 * HTQ 2026 — Upload IDs Database (Google Apps Script)
 * 
 * SETUP:
 * 1. Create a NEW Apps Script project at https://script.google.com
 * 2. Paste this code
 * 3. Replace SPREADSHEET_ID below with your spreadsheet ID
 * 4. Deploy as Web app (Execute as: Me, Access: Anyone)
 * 5. Copy the URL into upload_ids.html
 */

// ⚠️ REPLACE THIS with your actual Spreadsheet ID
var SPREADSHEET_ID = 'PASTE_YOUR_SPREADSHEET_ID_HERE';

function doPost(e) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // ---- Look up Team ID in Registrations sheet ----
    var regSheet = ss.getSheetByName("Registrations");
    var data = JSON.parse(e.postData.contents);
    
    var teamName = "Unknown Team";
    var teamFound = false;
    
    if (regSheet && regSheet.getLastRow() > 1) {
      var regData = regSheet.getRange("B2:C" + regSheet.getLastRow()).getValues();
      for (var r = 0; r < regData.length; r++) {
        if (regData[r][0] === data.teamId) {
          teamName = regData[r][1]; // Column C = Team Name
          teamFound = true;
          break;
        }
      }
    }
    
    if (!teamFound) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: "error", message: "Team ID not found. Please register first." }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // ---- Get or create UploadedIDs sheet ----
    var sheet = ss.getSheetByName("UploadedIDs");
    if (!sheet) {
      sheet = ss.insertSheet("UploadedIDs");
      sheet.appendRow([
        "Timestamp",
        "Team ID",
        "Team Name",
        "Team Size",
        "Members Info",
        "Payment Receipt"
      ]);
      sheet.getRange("1:1").setFontWeight("bold");
    }

    // ---- Save the payment receipt image to Google Drive ----
    var receiptUrl = "No receipt uploaded";
    if (data.paymentReceipt) {
      try {
        var base64Data = data.paymentReceipt.split(",")[1];
        var mimeType = data.paymentReceipt.match(/data:(.*?);/)[1];
        var extension = mimeType.split("/")[1] || "png";
        var blob = Utilities.newBlob(
          Utilities.base64Decode(base64Data),
          mimeType,
          teamName.replace(/[^a-zA-Z0-9]/g, "_") + "_receipt_" + new Date().getTime() + "." + extension
        );

        // Create or find the receipts folder
        var folders = DriveApp.getFoldersByName("HTQ_Receipts");
        var folder;
        if (folders.hasNext()) {
          folder = folders.next();
        } else {
          folder = DriveApp.createFolder("HTQ_Receipts");
        }

        var file = folder.createFile(blob);
        // Make the file viewable by anyone with the link
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        // Use direct viewable URL
        receiptUrl = "https://drive.google.com/file/d/" + file.getId() + "/view?usp=sharing";
      } catch (imgError) {
        receiptUrl = "Upload failed: " + imgError.toString();
      }
    }

    // ---- Format members info ----
    var membersInfo = "";
    for (var i = 0; i < data.members.length; i++) {
      var m = data.members[i];
      membersInfo += "Member " + (i + 1) + ": " + m.name + " | ID: " + m.nationalId;
      if (i < data.members.length - 1) membersInfo += "\n";
    }

    // ---- Append the row ----
    sheet.appendRow([
      new Date().toLocaleString("en-GB", { timeZone: "Africa/Cairo" }),
      data.teamId,
      teamName,
      data.teamSize,
      membersInfo,
      receiptUrl
    ]);

    sheet.autoResizeColumns(1, 6);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", message: "IDs uploaded successfully!" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: "Server error: " + error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", message: "HTQ Upload IDs API is running." }))
    .setMimeType(ContentService.MimeType.JSON);
}
