# Firestore Security Rules Setup Instructions

To fix the "Missing or insufficient permissions" error on the Profile Views page, you need to update your Firestore security rules. Follow these steps:

1. Go to your Firebase console: https://console.firebase.google.com/
2. Select your project
3. Go to Firestore Database → Rules
4. Replace the rules with the following:

```rules
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Basic user rules
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Posts rules
    match /posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && (
        request.auth.uid == resource.data.authorId ||
        request.auth.uid == resource.data.userId ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'moderator', 'founder']
      );
    }
    
    // Friend requests rules
    match /friendRequests/{requestId} {
      allow read: if request.auth != null && (
        request.auth.uid == resource.data.from || 
        request.auth.uid == resource.data.to
      );
      allow create: if request.auth != null && request.auth.uid == request.resource.data.from;
      allow delete: if request.auth != null && (
        request.auth.uid == resource.data.from || 
        request.auth.uid == resource.data.to
      );
    }
    
    // Profile views rules
    match /profileViews/{viewId} {
      // Users can only read profile views where they are the viewedUserId
      allow read: if request.auth != null && 
                   request.auth.uid == resource.data.viewedUserId;
      
      // Anyone can create a profile view
      allow create: if request.auth != null;
    }
  }
}
```

5. Click "Publish"
6. After publishing, it can take up to a minute for the rules to take effect

## Important Notes:
- These rules ensure that users can only see profile visits to their own profiles
- If users still can't view profile visits, check the console for specific error messages
- Make sure the profileViews collection has fields named exactly `viewerId` and `viewedUserId`
