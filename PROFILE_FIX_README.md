# Profile Update Fix for Wildlife Photo App

## Problem
The app was getting a "permission denied for schema public" error when trying to update the `display_name` field in the profiles table. This happened because:

1. **Missing Profile Records**: When users signed up, no profile record was automatically created in the `profiles` table
2. **RLS Policy Mismatch**: The Row Level Security policy `auth.uid() = id` failed because there was no profile record to match against
3. **Permission Issues**: The authenticated user didn't have the necessary permissions to update the profiles table

## Solution

### 1. Database Setup (Run in Supabase SQL Editor)

Execute the SQL commands in `database_setup.sql` to:
- Create a trigger function that automatically creates profiles when users sign up
- Set up proper RLS policies for the profiles table
- Grant necessary permissions to authenticated users

**Important**: Run this in your Supabase project's SQL Editor before testing the app.

### 2. Code Changes Made

#### Profile Management Utilities (`utils/profileUtils.ts`)
- `ensureProfileExists()`: Creates a profile if one doesn't exist
- `updateDisplayName()`: Safely updates the display name
- `getUserProfile()`: Retrieves user profile data

#### Profile Screen (`app/(tabs)/profile.tsx`)
- Updated `handleSaveProfile()` to use the new utility functions
- Added proper error handling and profile creation fallback
- Integrated with the authentication context

#### Auth Context (`context/AuthContext.tsx`)
- Automatically ensures profiles exist when users sign in
- Prevents the permission issue from occurring in the first place

### 3. How It Works Now

1. **User Signs Up/In**: The auth context automatically creates a profile if one doesn't exist
2. **Profile Update**: The profile screen uses utility functions to safely update the display name
3. **Fallback Handling**: If a profile doesn't exist, it's created automatically before updating
4. **Error Prevention**: The permission denied error should no longer occur

### 4. Testing

1. Run the SQL setup in Supabase
2. Test updating the display name in the profile screen
3. Verify that new users automatically get profiles created
4. Check that existing users can update their display names

### 5. Files Modified

- `database_setup.sql` - Database setup (NEW)
- `utils/profileUtils.ts` - Profile management utilities (NEW)
- `app/(tabs)/profile.tsx` - Profile screen updates
- `context/AuthContext.tsx` - Auth context improvements

### 6. Next Steps

After implementing this fix, you can:
- Add more profile fields (bio, profile image, etc.)
- Implement profile picture uploads
- Add username validation and uniqueness checks
- Create profile completion flows for new users

## Troubleshooting

If you still get permission errors:
1. Ensure the SQL setup was run successfully
2. Check that RLS is enabled on the profiles table
3. Verify the trigger function exists and is working
4. Check the Supabase logs for any function execution errors
