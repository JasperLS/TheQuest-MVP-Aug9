# Likes Implementation for Wildlife Photo App

## Overview
This document describes the implementation of the likes functionality that allows users to like posts in the wildlife photo app. The system integrates with Supabase backend to persist likes data and provide real-time updates.

## Database Schema

### Likes Table
```sql
CREATE TABLE public.likes (
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT likes_pkey PRIMARY KEY (post_id, user_id),
  CONSTRAINT likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  CONSTRAINT likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
);
```

### RLS Policies
- **`likes: insert by user`**: Users can only insert likes for themselves
- **`likes: delete by user`**: Users can only delete their own likes
- **`likes: public select`**: Everyone can view like counts and status

## Implementation Details

### 1. Likes Utilities (`utils/likesUtils.ts`)
The core likes functionality is implemented in a dedicated utility file:

- **`addLike(postId, userId)`**: Add a like to a post
- **`removeLike(postId, userId)`**: Remove a like from a post
- **`toggleLike(postId, userId)`**: Toggle like status (add if not exists, remove if exists)
- **`getLikeCount(postId)`**: Get the total number of likes for a post
- **`isPostLikedByUser(postId, userId)`**: Check if a specific user liked a post
- **`getPostLikes(postId)`**: Get all likes for a post with user information

### 2. Feed Screen Integration (`app/(tabs)/index.tsx`)
The main feed screen now uses real likes data:

- **Real-time Loading**: Likes data is loaded when the component mounts
- **Optimistic Updates**: UI updates immediately while database operations happen in background
- **Error Handling**: User-friendly error messages for failed operations
- **Pull-to-Refresh**: Refreshes likes data when user pulls down

### 3. Identification Screen Integration (`app/identification/[id].tsx`)
Individual post screens also support real likes:

- **Consistent Behavior**: Same like functionality as feed screen
- **Real-time Updates**: Like counts and status sync with database
- **User Authentication**: Only logged-in users can like posts

## User Experience Features

### ✅ **What Users Get**
- **Instant Feedback**: Like buttons respond immediately with haptic feedback
- **Real-time Counts**: Like counts update in real-time across all screens
- **Persistent State**: Likes survive app restarts and device changes
- **Error Handling**: Clear messages if something goes wrong

### 🔄 **Automatic Behaviors**
- **Data Sync**: Likes automatically sync from database on app load
- **Cross-screen Consistency**: Like status is consistent between feed and detail views
- **Optimistic Updates**: UI feels responsive even with network delays

## Technical Implementation

### **State Management**
- **Local State**: Optimistic updates for immediate UI feedback
- **Database Sync**: Real data loaded on component mount and refresh
- **Error Recovery**: Failed operations show alerts and can be retried

### **Performance Optimizations**
- **Batch Loading**: All likes data loaded at once for feed screen
- **Indexed Queries**: Database indexes on `user_id` and `post_id` for fast lookups
- **Efficient Updates**: Only changed data is updated in local state

### **Security Features**
- **Row Level Security**: Users can only modify their own likes
- **Authentication Checks**: All like operations verify user login status
- **Input Validation**: Post and user IDs are validated before database operations

## Database Setup

### **Required SQL**
Run the following in your Supabase SQL Editor:

```sql
-- Create likes table
CREATE TABLE IF NOT EXISTS public.likes (
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT likes_pkey PRIMARY KEY (post_id, user_id),
  CONSTRAINT likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  CONSTRAINT likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_likes_user ON public.likes USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_likes_post ON public.likes USING btree (post_id);

-- Enable RLS
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "likes: insert by user" ON public.likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes: delete by user" ON public.likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "likes: public select" ON public.likes FOR SELECT TO public USING (true);
```

## Testing

### **Manual Testing Steps**
1. **Setup**: Run the database setup SQL in Supabase
2. **Login**: Sign in to the app with a valid user account
3. **Feed Screen**: Navigate to the main feed and try liking posts
4. **Detail Screen**: Open individual posts and verify like functionality
5. **Refresh**: Pull down to refresh and verify likes persist
6. **Cross-device**: Test on different devices to verify data sync

### **Expected Behavior**
- ✅ Like buttons respond immediately with haptic feedback
- ✅ Like counts update in real-time
- ✅ Like status persists across app restarts
- ✅ Error messages appear for failed operations
- ✅ Only authenticated users can like posts

## Future Enhancements

### **Potential Improvements**
- **Real-time Updates**: WebSocket integration for live like updates
- **Like Animations**: Heart animations when liking posts
- **Like Notifications**: Notify post owners when their posts get liked
- **Like Analytics**: Track popular posts and user engagement
- **Batch Operations**: Allow users to like multiple posts at once

### **Scalability Considerations**
- **Pagination**: Load likes in batches for posts with many likes
- **Caching**: Implement client-side caching for frequently accessed data
- **Rate Limiting**: Prevent spam liking with rate limiting
- **Database Optimization**: Monitor query performance and optimize as needed

## Troubleshooting

### **Common Issues**
1. **"You must be logged in to like posts"**
   - Ensure user is authenticated
   - Check AuthContext is properly set up

2. **"Failed to update like"**
   - Verify database setup is complete
   - Check RLS policies are correctly configured
   - Ensure user has proper permissions

3. **Likes not persisting**
   - Check database connection
   - Verify likes table exists and has correct structure
   - Check RLS policies allow proper operations

### **Debug Steps**
1. Check browser console for error messages
2. Verify Supabase connection in network tab
3. Check database logs for failed operations
4. Verify RLS policies are active and correct
5. Test with a fresh user account

## Files Modified

- `utils/likesUtils.ts` - Core likes functionality (NEW)
- `app/(tabs)/index.tsx` - Feed screen integration
- `app/identification/[id].tsx` - Detail screen integration
- `database_setup.sql` - Database schema and policies
- `LIKES_IMPLEMENTATION.md` - This documentation (NEW)

## Dependencies

- `@supabase/supabase-js` - Database operations
- `expo-haptics` - Haptic feedback
- React Native core components for UI
- Existing app context and authentication system
