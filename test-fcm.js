const admin = require("firebase-admin");
const serviceAccount = require("./aswaq-sajjad-firebase-adminsdk-fbsvc-1e9424a4cb.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// We need a valid device token from the database
const token = "dhQqMEg-RFigRWY92OO1yD:APA91bEwDC11IFArenosqeBwrnMCwR9WpG6pLzgrxtXLUwxhCBoMY55tCpPfKCHHbiMnIuO7hHJJm08K8MOtsJdfwcthNQ_41-MeH36Kghgd2HnndY";

const message = {
    token: token,
    notification: {
        title: 'Test Title - Background',
        body: 'Did this wake the device?'
    },
    data: {
        type: 'test_notification'
    },
    android: {
        priority: "high",
        notification: {
            sound: "default",
            channelId: "orders_channel", // In Firebase Admin SDK it's channelId, not channel_id
        }
    }
};

admin.messaging().send(message)
    .then((response) => {
        console.log('Successfully sent message:', response);
    })
    .catch((error) => {
        console.log('Error sending message:', error);
    });
