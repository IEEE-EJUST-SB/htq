/**
 * HTQ 2026 — Unified Backend
 * 
 * Handles BOTH registration AND upload requests
 * from a single doPost() entry point.
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // Dispatch: if "members" exists, it's an upload request
    if (data.members) {
      return handleUploadIds(data);
    }

    // Otherwise it's a registration request
    return handleRegistration(data);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "error",
        message: "Server error: " + error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: "ok",
      message: "HTQ API is running."
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==============================
//  REGISTRATION HANDLER
// ==============================
function handleRegistration(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Registrations");

  if (!sheet) {
    sheet = ss.insertSheet("Registrations");
    sheet.appendRow([
      "Timestamp", "Team ID", "Team Name", "Leader Name",
      "Email", "University", "IEEE Member", "IEEE Membership ID",
      "CS Member", "Team Size", "Notes"
    ]);
    sheet.getRange("1:1").setFontWeight("bold");
  }

  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var teamNames = sheet.getRange("C2:C" + lastRow).getValues().flat();
    if (teamNames.includes(data.teamName)) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: "error", message: "A team with this name already exists." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var emails = sheet.getRange("E2:E" + lastRow).getValues().flat();
    if (emails.includes(data.email)) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: "error", message: "This email has already been used." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var existingIds = sheet.getRange("B2:B" + lastRow).getValues().flat();
    if (existingIds.includes(data.teamId)) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: "error", message: "ID collision, please try again." }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  sheet.appendRow([
    new Date().toLocaleString("en-GB", { timeZone: "Africa/Cairo" }),
    data.teamId, data.teamName, data.fullName, data.email,
    data.university, data.ieeeMember, data.membershipId || "N/A",
    data.csMember, data.teamSize, data.comments || "—"
  ]);

  sheet.autoResizeColumns(1, 11);

  return ContentService
    .createTextOutput(JSON.stringify({
      status: "success",
      message: "Registration submitted successfully!",
      teamId: data.teamId
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
