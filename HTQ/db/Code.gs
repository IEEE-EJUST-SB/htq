/**
 * HTQ 2026 — Registration Database (Google Apps Script)
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://sheets.google.com and create a new spreadsheet
 * 2. Rename the first sheet tab to "Registrations"
 * 3. Headers will be auto-created on first submission
 * 
 * 4. Go to Extensions > Apps Script
 * 5. Delete any existing code and paste this entire file
 * 6. Click Deploy > New Deployment
 * 7. Select type: "Web app"
 * 8. Set "Execute as" to "Me"
 * 9. Set "Who has access" to "Anyone"
 * 10. Click Deploy and authorize when prompted
 * 11. Copy the Web App URL and paste it in register.html (SCRIPT_URL variable)
 */

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Registrations");

    if (!sheet) {
      sheet = ss.insertSheet("Registrations");
      sheet.appendRow([
        "Timestamp",
        "Team ID",
        "Team Name",
        "Leader Name",
        "Email",
        "University",
        "IEEE Member",
        "IEEE Membership ID",
        "CS Member",
        "Team Size",
        "Notes"
      ]);
      sheet.getRange("1:1").setFontWeight("bold");
    }

    var data = JSON.parse(e.postData.contents);

    // Check for duplicate team name
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var teamNames = sheet.getRange("C2:C" + lastRow).getValues().flat();
      if (teamNames.includes(data.teamName)) {
        return ContentService
          .createTextOutput(JSON.stringify({ status: "error", message: "A team with this name already exists." }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // Check for duplicate email
      var emails = sheet.getRange("E2:E" + lastRow).getValues().flat();
      if (emails.includes(data.email)) {
        return ContentService
          .createTextOutput(JSON.stringify({ status: "error", message: "This email has already been used." }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // Check for duplicate Team ID (extremely unlikely but safe)
      var existingIds = sheet.getRange("B2:B" + lastRow).getValues().flat();
      if (existingIds.includes(data.teamId)) {
        return ContentService
          .createTextOutput(JSON.stringify({ status: "error", message: "ID collision, please try again." }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // Append the new registration row
    sheet.appendRow([
      new Date().toLocaleString("en-GB", { timeZone: "Africa/Cairo" }),
      data.teamId,
      data.teamName,
      data.fullName,
      data.email,
      data.university,
      data.ieeeMember,
      data.membershipId || "N/A",
      data.csMember,
      data.teamSize,
      data.comments || "—"
    ]);

    // Auto-resize columns for readability
    sheet.autoResizeColumns(1, 11);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", message: "Registration submitted successfully!", teamId: data.teamId }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: "Server error: " + error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", message: "HTQ Registration API is running." }))
    .setMimeType(ContentService.MimeType.JSON);
}
