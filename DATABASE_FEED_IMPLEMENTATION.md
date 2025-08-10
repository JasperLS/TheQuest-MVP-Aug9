# Database Feed Implementation for Wildlife Photo App

## Overview
This document describes the implementation of pulling posts from the database instead of using local discoveries. The app now fetches the last 4 posts based on `created_at` from the Supabase database.

## Changes Made

### 1. Database Schema Updates (`database_setup.sql`)
- **Posts Table**: Created with proper structure for storing wildlife photo posts
- **Animals Table**: Added for storing animal information
- **RLS Policies**: Implemented Row Level Security for proper access control
- **Indexes**: Added performance indexes on `user_id`, `animal_id`, and `created_at`

### 2. Posts Utilities (`utils/postsUtils.ts`)
- **`createPost()`**: Function to create new posts in the database
- **`getLatestPosts()`**: Function to fetch the last 4 posts ordered by `created_at`
- **`FeedPost` Interface**: New interface for database post data with user and animal information

### 3. App Context Updates (`context/AppContext.tsx`)
- **`addDiscoveryFromEdgeResult()`**: Now creates database posts when discoveries are saved
- **Database Integration**: Automatically saves posts to Supabase for authenticated users

### 4. Feed Screen Overhaul (`app/(tabs)/index.tsx`)
- **Database Posts**: Feed now pulls from database instead of local discoveries
- **Real-time Data**: Posts and likes are fetched from Supabase
- **Pull-to-Refresh**: Refreshes both posts and likes data
- **Loading States**: Added proper loading and empty state handling

## Database Schema

### Posts Table
```sql
CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  animal_id uuid NULL,
  image_url text NOT NULL,
  location text NULL,
  quality integer NOT NULL,
  caption text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_animal_id_fkey FOREIGN KEY (animal_id) REFERENCES animals (id) ON DELETE SET NULL,
  CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE,
  CONSTRAINT posts_quality_check CHECK (quality >= 1 AND quality <= 10)
);
```

### Animals Table
```sql
CREATE TABLE public.animals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  scientific_name text NOT NULL,
  rarity text NOT NULL DEFAULT 'common',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT animals_pkey PRIMARY KEY (id)
);
```

## How It Works Now

### 1. **Post Creation Flow**
1. User takes photo and identifies animal
2. `addDiscoveryFromEdgeResult()` is called
3. Local discovery is added to state
4. Database post is created in Supabase (if user is authenticated)
5. Post appears in the feed immediately

### 2. **Feed Loading Flow**
1. Component mounts and calls `getLatestPosts()`
2. Fetches last 4 posts from database ordered by `created_at`
3. Loads like data for each post
4. Renders feed with real database data

### 3. **Likes Integration**
1. Like buttons work with real database posts
2. Like counts are fetched from Supabase
3. Like status is checked for current user
4. Optimistic updates for better UX

## Benefits

### ✅ **What We've Achieved**
- **Real Data**: Feed now shows actual database posts instead of local mock data
- **Persistent Storage**: Posts survive app restarts and device changes
- **Scalable**: Can easily fetch more posts or implement pagination
- **Consistent**: All users see the same posts (when we implement multi-user)
- **Performance**: Database indexes ensure fast queries

### 🔄 **Future Possibilities**
- **Multi-user Feed**: Show posts from all users, not just current user
- **Pagination**: Load more posts as user scrolls
- **Real-time Updates**: WebSocket integration for live feed updates
- **Search & Filter**: Implement post search and filtering
- **Comments**: Add comment functionality to posts

## Setup Instructions

### 1. **Database Setup**
Run the updated `database_setup.sql` in your Supabase SQL Editor to:
- Create the posts and animals tables
- Set up proper RLS policies
- Grant necessary permissions

### 2. **Test the Implementation**
1. **Take a Photo**: Use the camera to identify an animal
2. **Save Discovery**: The discovery should now create a database post
3. **Check Feed**: The feed should show the post from the database
4. **Test Likes**: Like functionality should work with real database posts

### 3. **Verify Database**
Check your Supabase dashboard to see:
- Posts being created in the `posts` table
- Proper RLS policies in place
- Indexes created for performance

## Troubleshooting

### **Common Issues**
- **Permission Denied**: Ensure RLS policies are properly set up
- **Posts Not Loading**: Check if the `getLatestPosts()` function is working
- **Likes Not Working**: Verify the likes table and policies are set up correctly

### **Debug Steps**
1. Check browser console for error messages
2. Verify database tables exist in Supabase
3. Test database queries directly in Supabase SQL Editor
4. Ensure user authentication is working properly

## Next Steps

### **Immediate Improvements**
- Add error handling for failed post creation
- Implement post editing and deletion
- Add location support for posts

### **Long-term Features**
- Multi-user feed with posts from all users
- Post categories and tags
- Advanced search and filtering
- Real-time notifications for likes and comments
