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
  // Handle Team ID recovery
  if (e && e.parameter && e.parameter.action === 'recoverTeamId') {
    return handleRecoverTeamId(e.parameter);
  }

  return ContentService
    .createTextOutput(JSON.stringify({
      status: "ok",
      message: "HTQ API is running."
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==============================
//  TEAM ID RECOVERY HANDLER
// ==============================
function handleRecoverTeamId(params) {
  var teamName = (params.teamName || "").trim().toLowerCase();
  var email = (params.email || "").trim().toLowerCase();

  if (!teamName || !email) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "error",
        message: "Team name and email are required."
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Registrations");

  if (!sheet || sheet.getLastRow() < 2) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "error",
        message: "No registrations found."
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Columns: B=Team ID, C=Team Name, E=Email
  var data = sheet.getRange("B2:E" + sheet.getLastRow()).getValues();

  for (var i = 0; i < data.length; i++) {
    var rowTeamId   = data[i][0]; // Column B
    var rowTeamName = (data[i][1] || "").toString().trim().toLowerCase(); // Column C
    var rowEmail    = (data[i][3] || "").toString().trim().toLowerCase(); // Column E

    if (rowTeamName === teamName && rowEmail === email) {
      return ContentService
        .createTextOutput(JSON.stringify({
          status: "success",
          teamId: rowTeamId
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({
      status: "error",
      message: "No matching team found. Please check your team name and email."
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
