var usersSheet = SpreadsheetApp.openById('1mlpzH0WWO1PWOki3ytpdnKuF6KuqulgGPTVdP2U6LTI').getSheetByName('Users');
var leaveRequestsSheet = SpreadsheetApp.openById('1mlpzH0WWO1PWOki3ytpdnKuF6KuqulgGPTVdP2U6LTI').getSheetByName('Leaves');
var remarksSheet = SpreadsheetApp.openById('1mlpzH0WWO1PWOki3ytpdnKuF6KuqulgGPTVdP2U6LTI').getSheetByName('Remarks');

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('ToutPetit')
    .setTitle('Leave Tracking System');
}

function registerUser(username, password, email, role, roomCode) {
  var users = usersSheet.getDataRange().getValues();
  for (var i = 1; i < users.length; i++) {
    if (users[i][0] === username || users[i][2] === email) {
      return false;
    }
  }
  
  if (role === 'Admin' && !roomCode) {
    roomCode = generateRandomRoomNumber();
  }

  usersSheet.appendRow([username, password, email, role, roomCode]);
  sendAccountCreationEmail(email, username, role, roomCode);
  return true;
}

function generateRandomRoomNumber() {
  return Math.floor(10000 + Math.random() * 90000);
}

function login(username, password) {
  var users = usersSheet.getDataRange().getValues();
  for (var i = 1; i < users.length; i++) {
    if (users[i][0] === username && users[i][1] === password) {
      var roomCode = users[i][4];
      
      if (users[i][3] === 'Admin' && !roomCode) {
        roomCode = generateRandomRoomNumber();
        usersSheet.getRange(i + 1, 5).setValue(roomCode);
        sendRoomJoinEmail(users[i][2], username, roomCode);
      }

      return {
        username: users[i][0],
        email: users[i][2],
        role: users[i][3],
        roomCode: roomCode
      };
    }
  }
  return null;
}

function requestLeave(username, leaveDate) {
  leaveRequestsSheet.appendRow([username, leaveDate, 'Pending']);
  return true;
}

function addRemark(username, remarkDate, remarkText) {
  remarksSheet.appendRow([username, remarkDate, remarkText]);
  return true;
}

function blockDate(username, remarkDate) {
  remarksSheet.appendRow([username, remarkDate, 'Blocked']);
  return true;
}

function getPendingLeaveRequests() {
  var requests = leaveRequestsSheet.getDataRange().getValues();
  var pendingRequests = [];
  for (var i = 1; i < requests.length; i++) {
    if (requests[i][2] === 'Pending') {
      pendingRequests.push({
        username: requests[i][0],
        date: requests[i][1]
      });
    }
  }
  return pendingRequests;
}

function approveLeaveRequest(username, leaveDate) {
  var requests = leaveRequestsSheet.getDataRange().getValues();
  for (var i = 1; i < requests.length; i++) {
    if (requests[i][0] === username && requests[i][1] === leaveDate && requests[i][2] === 'Pending') {
      leaveRequestsSheet.getRange(i + 1, 3).setValue('Approved');
      var userEmail = getUserEmail(username);
      sendLeaveRequestStatusEmail(userEmail, username, 'Approved', leaveDate);
      return true;
    }
  }
  return false;
}

function rejectLeaveRequest(username, leaveDate) {
  var requests = leaveRequestsSheet.getDataRange().getValues();
  for (var i = 1; i < requests.length; i++) {
    if (requests[i][0] === username && requests[i][1] === leaveDate && requests[i][2] === 'Pending') {
      leaveRequestsSheet.getRange(i + 1, 3).setValue('Rejected');
      var userEmail = getUserEmail(username);
      sendLeaveRequestStatusEmail(userEmail, username, 'Rejected', leaveDate);
      return true;
    }
  }
  return false;
}

function getUserByUsername(username) {
  var userSheet = SpreadsheetApp.openById('1mlpzH0WWO1PWOki3ytpdnKuF6KuqulgGPTVdP2U6LTI').getSheetByName('Users');
  var users = userSheet.getDataRange().getValues();
  
  for (var i = 1; i < users.length; i++) {
    if (users[i][0] === username) {
      return {
        username: users[i][0],
        role: users[i][1]
      };
    }
  }
  return null;
}

function getUserEmail(username) {
  var users = usersSheet.getDataRange().getValues();
  for (var i = 1; i < users.length; i++) {
    if (users[i][0] === username) {
      return users[i][2];
    }
  }
  return null;
}

function fetchEvents(username) {
  console.log('Fetching events for username:', username);

  var leaveEvents = leaveRequestsSheet.getDataRange().getValues();
  console.log('Leave Events:', leaveEvents);

  var events = [];

  if (!username) {
    console.log('Username is not provided. Fetching all pending requests.');
    for (var i = 1; i < leaveEvents.length; i++) {
      var leaveDate = leaveEvents[i][1];
      var status = leaveEvents[i][2];
      if (status === 'Pending') {
        var color = 'orange';
        events.push({
          title: 'Leave (' + status + ')',
          start: leaveDate,
          allDay: true,
          color: color
        });
      }
    }
  } else {
    var user = getUserByUsername(username);

    if (!user) {
      console.error('User not found:', username);
      return [];
    }

    for (var i = 1; i < leaveEvents.length; i++) {
      var eventUsername = leaveEvents[i][0];
      var leaveDate = leaveEvents[i][1];
      var status = leaveEvents[i][2];
      console.log('Processing event:', eventUsername, leaveDate, status);

      if (eventUsername === username || user.role === 'Admin') {
        var color = status === 'Approved' ? 'green' : (status === 'Pending' ? 'orange' : 'red');
        events.push({
          title: 'Leave (' + status + ')',
          start: leaveDate,
          allDay: true,
          color: color
        });
      }
    }
  }

  console.log('Events Array:', events);
  return events || [];
}

function getDateInfo(dateString) {
  var leaveEvents = leaveRequestsSheet.getDataRange().getValues();
  var remarkEvents = remarksSheet.getDataRange().getValues();

  var isLeaveDay = leaveEvents.some(function(event) {
    return event[1] === dateString && event[2] === 'Approved';
  });

  var isRemarkDay = remarkEvents.some(function(event) {
    return event[1] === dateString;
  });

  return {
    isLeaveDay: isLeaveDay,
    isRemarkDay: isRemarkDay
  };
}

function joinRoom(username, roomCode) {
  var users = usersSheet.getDataRange().getValues();
  for (var i = 1; i < users.length; i++) {
    if (users[i][0] === username) {
      usersSheet.getRange(i + 1, 5).setValue(roomCode);
      sendRoomJoinEmail(users[i][2], username, roomCode);
      return true;
    }
  }
  return false;
}

function leaveRoom(username) {
  var users = usersSheet.getDataRange().getValues();
  for (var i = 1; i < users.length; i++) {
    if (users[i][0] === username) {
      var oldRoomCode = users[i][4];
      usersSheet.getRange(i + 1, 5).setValue('');
      sendRoomLeaveEmail(users[i][2], username);
      return true;
    }
  }
  return false;
}

function deleteRoom(adminUsername) {
  var users = usersSheet.getDataRange().getValues();
  var adminEmail = '';
  var roomCode = '';
  var affectedUsers = [];

  for (var i = 1; i < users.length; i++) {
    if (users[i][0] === adminUsername && users[i][3] === 'Admin') {
      adminEmail = users[i][2];
      roomCode = users[i][4];
      break;
    }
  }

  if (!roomCode) return false;

  for (var i = 1; i < users.length; i++) {
    if (users[i][4] === roomCode) {
      affectedUsers.push({email: users[i][2], username: users[i][0]});
      usersSheet.getRange(i + 1, 5).setValue('');
    }
  }

  sendRoomDeletedEmail(adminEmail, adminUsername, roomCode, affectedUsers);
  return true;
}

function sendRoomDeletedEmail(adminEmail, adminUsername, roomCode, affectedUsers) {
  var subject = "Room Deleted";
  var adminBody = "Hello " + adminUsername + ",\n\nYou have successfully deleted room " + roomCode + ".";
  sendEmail(adminEmail, subject, adminBody);

  affectedUsers.forEach(function(user) {
    var userBody = "Hello " + user.username + ",\n\nThe room " + roomCode + " you were part of has been deleted by the admin.";
    sendEmail(user.email, subject, userBody);
  });
}

function sendEmail(recipient, subject, body) {
  MailApp.sendEmail(recipient, subject, body);
}

function sendAccountCreationEmail(email, username, role, roomCode) {
  var subject = "Account Created Successfully";
  var body = "Hello " + username + ",\n\nYour account has been created successfully as " + role + ".\n";
  if (role === 'Admin') {
    body += "Your room code is: " + roomCode + ".\n";
  }
  sendEmail(email, subject, body);
}

function sendRoomJoinEmail(email, username, roomCode) {
  var subject = "Room Joined Successfully";
  var body = "Hello " + username + ",\n\nYou have successfully joined room " + roomCode + ".";
  sendEmail(email, subject, body);
}

function sendRoomLeaveEmail(email, username) {
  var subject = "Room Left Successfully";
  var body = "Hello " + username + ",\n\nYou have successfully left your current room.";
  sendEmail(email, subject, body);
}

function sendLeaveRequestStatusEmail(email, username, status, date) {
  var subject = "Leave Request " + status;
  var body = "Hello " + username + ",\n\nYour leave request for " + date + " has been " + status.toLowerCase() + ".";
  sendEmail(email, subject, body);
}
