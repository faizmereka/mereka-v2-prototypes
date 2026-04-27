# Experience Creation Flow - Test Flow Documentation

## Overview
This document captures the detailed step-by-step flow for creating a Platform Experience through the UI, based on actual page inspection and user requirements.

## Entry Flow (Already Correct)
1. User logs in
2. Navigate to Hub Dashboard (/hub/overview)
3. Click "Manage Services" menu
4. Click "Experiences" option
5. Click "Add an Experience" button
6. Select "Platform Listing" option
7. Click "Next" button
8. Arrive at Basic Info page (/onboarding/experience/platform/basic-info)

## Page 1: Basic Info Page (/onboarding/experience/platform/basic-info)

### Section: "Your Experience"

#### Step 1: Title & Experience Link (Required)
- **Title Field**: 
  - Input field with placeholder "Name"
  - Character limit: 100 characters (shown as "0/100")
  - Form control name: experienceTitle (based on inspection)
  - **Action**: Fill with experience title
  
- **Experience Link**: 
  - Auto-generated from title
  - Format: mereka.io/experience/your-experience-name
  - Can be edited manually
  - **Action**: Verify link is generated correctly (may need to edit)

#### Step 2: Experience Category
**Sub-steps:**
1. **Select Experience Type**:
   - Options available: Event, Talk, Program, Show & Exhibition, Workshop
   - These are card-like buttons (not radio buttons)
   - **Action**: Click on one of the experience type cards
   - Example: Click "Event" card

2. **Add Theme**:
   - Button labeled "Add Theme +"
   - **Action**: Click "Add Theme +" button
   - Error message appears if no theme added: "Please submit at least one theme."

3. **Select Main Theme Category**:
   - Options: Art & Design, Music & Audio, Technology, Business, Health & Wellness, Education, Photography, Writing
   - These are button/tag selectors
   - **Action**: Click on one main theme category
   - Example: Click "Art & Design"

4. **Select Topic Within Theme**:
   - Options depend on selected main theme
   - For "Art & Design": Painting, Drawing, Sculpture, Digital Art, Graphic Design
   - **Action**: Click on one or more topics
   - Can select multiple topics (up to 3 themes total)

#### Step 3: Experience Mode (Required)
- **Options**: Physical, Virtual, Hybrid (radio buttons)
- **Action**: Select one mode
- **Notes**: 
  - Physical requires location
  - Virtual needs meeting link
  - Hybrid supports both

#### Step 4: Location (Conditional - Required for Physical/Hybrid)
- **Tabs**: Hub Address, New Address, Other Hub Venue
- **If "Hub Address" tab selected**:
  - Fields should be pre-filled from hub profile:
    - Street Address: "West Jakarta, Jakarta"
    - Country: "Indonesia"
    - State (if any): "Jakarta"
    - Town / City: "West Jakarta"
  - **Action**: Verify all fields are filled correctly
  - Map should show location with pin

#### Step 5: Host Selection (Optional)
- **Dropdown**: "Choose team member"
- **Options**: Team members from hub (e.g., "Fadlan Testing 01 (Owner)")
- **Checkbox**: "This experience doesn't have a specific host"
- **Action**: Select host from dropdown (or check checkbox if no host)
- **Note**: Can add up to 3 hosts

#### Step 6: Navigate to Next Page
- **Button**: "Continue" or "Next" button
- **Action**: Click Continue button
- **Expected**: Navigate to Audience page (/onboarding/experience/platform/audience)


## Page 2: Audience Page (/onboarding/experience/platform/audience)

### Section: "Your Audience"

#### Step 1: Experience Access
- **Question**: "Who is your Experience open to?"
- **Options**: 
  - Radio button: "Everyone" (default/selected)
  - Radio button: "Members" (with info icon)
- **Checkbox**: "I want my Experience to be hidden" (optional, unchecked by default)
- **Action**: Select "Everyone" radio button (default selection)

#### Step 2: Target Audience
- **Question**: "Who is the target audience for your Experience?"
- **Description**: "Indicate whether your Experience is open to everyone, or if it suits the needs of a particular group."
- **Options**:
  - Radio button: "Open to Everyone" (select this)
  - Radio button: "Specific Groups"
- **Action**: Click "Open to Everyone" radio button
- **Note**: Tips section explains this doesn't exclude other learners, just helps with informed booking

#### Step 3: Level of Expertise (Optional)
- **Question**: "What level of expertise does your audience require?"
- **Tag**: "OPTIONAL"
- **Description**: "Please indicate the expertise level to best match the audience with your Experience."
- **Options** (radio buttons):
  - Beginner (select this)
  - Intermediate
  - Advanced
  - Not Applicable
- **Skills Input Field**: "What skills does your audience need to be intermediate or advanced in?" (only appears if Intermediate/Advanced selected)
- **Action**: Select "Beginner" radio button

#### Step 4: Language Selection
- **Section Title**: "Language"
- **Primary Language**:
  - Question: "What language will you be hosting in?"
  - Dropdown: "Choose language"
  - **Action**: Select "English" from dropdown
- **Secondary Language** (Optional):
  - Question: "Do you know any other languages?"
  - Tag: "OPTIONAL"
  - Dropdown: "Choose language" (placeholder: "Select language")
  - **Action**: Select "Malay" from dropdown

#### Step 5: Navigate to Next Page
- **Button**: "Continue" or "Next" button
- **Action**: Click Continue button
- **Expected**: Navigate to Booking page (/onboarding/experience/platform/booking)

## Page 3: Booking Details Page (/onboarding/experience/platform/booking)

**Note**: This is one of the crucial pages in the experience creation flow.

### Section: "Schedule & Duration"

#### Step 1: Schedule Duration (Required)
- **Question**: "How long will your Experience be?"
- **Description**: "Indicate the duration that each of your slots will be."
- **Input Fields**: Two dropdowns for duration selection:
  - **Hour(s) Dropdown**: Select number of hours
  - **Minute(s) Dropdown**: Select number of minutes
- **Action**: Select "1" hour and "30" minutes from the dropdowns
- **Expected Result**: Duration set to 1 hour 30 minutes

#### Step 2: Timezone Selection (Required)
- **Question**: "What timezone will you be hosting from?"
- **Description**: "You will also be able to change the timezone later."
- **Input Field**: Timezone dropdown
- **Action**: Select "Malaysia (GMT+8)" from the timezone dropdown
- **Expected Result**: Timezone set to Malaysia

#### Step 3: Add Hosting Slot
- **Question**: "When will you be hosting your Experience?"
- **Description**: "You will be able to add or change the exact dates later."
- **Tabs Available**: 
  - "Upcoming" (default selected)
  - "Recurring" (with info icon)
  - "Past"
- **Action**: Click the "+ Add Slot" button
- **Expected Result**: Slot configuration modal/form opens

#### Step 4: Select Date from Calendar
- **Label**: "Date"
- **Input Field**: Date picker with placeholder "dd/mm/yyyy"
- **Calendar Icon**: Clickable calendar icon next to the input field
- **Action**: 
  - Click the date input field or calendar icon
  - Select today's date from the calendar picker
- **Expected Result**: Today's date is selected and displayed in the date field

#### Step 5: Select Start Time
- **Label**: "Start Time"
- **Input Fields**: Three components for time selection:
  - **Hour Dropdown**: Select hour (24-hour format or 12-hour format)
  - **Minute Dropdown**: Select minutes (00, 05, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55)
  - **AM/PM Toggle**: Toggle between AM and PM (if 12-hour format)
- **Action**: 
  - Select "08" from hour dropdown
  - Select "30" from minute dropdown
  - Select "AM" from AM/PM toggle
- **Expected Result**: Start time set to 8:30 AM

#### Step 6: Select Occurrence/Repeat Pattern
- **Label**: "Repeat" or "Occurrence"
- **Input Field**: Dropdown for recurrence pattern selection
- **Options Available**: Daily, Weekly, Monthly, etc.
- **Action**: Select "Daily" from the dropdown
- **Expected Result**: Recurrence pattern set to Daily

#### Step 7: Save Slot
- **Button**: "Save Slot" button (with checkmark icon)
- **Action**: Click the "Save Slot" button
- **Expected Result**: 
  - Slot is saved and added to the list
  - Modal/form closes
  - Slot appears in the "Recurring" tab (if repeat pattern is set)
  - **Verification**: After saving, switch to "Recurring" tab and verify slot appears with date/time information

#### Step 8: Navigate to Next Page
- **Button**: "Continue" button (at bottom right)
- **Action**: Click Continue button
- **Expected**: Navigate to Tickets page (/onboarding/experience/platform/tickets)

## Page 4: Tickets Page (/onboarding/experience/platform/tickets)

**Note**: This is also one of the crucial pages in the experience creation flow.

### Section: "Service Fee"

#### Step 1: Service Fee Selection (Required)
- **Question**: "Will you be absorbing the service fee for this Experience?"
- **Description**: "You have the option to absorb this fee or pass it to your users."
- **Options** (Radio buttons):
  - **Option 1**: "No, users will bear the service fee" (select this)
    - Description: "Users will pay the service fee on top of the standard ticket price"
  - **Option 2**: "Yes, I will absorb the service fee"
    - Description: "The service fee will be deducted from my earnings"
- **Action**: Select the first option "No, users will bear the service fee"
- **Expected Result**: Service fee option selected, users will pay the service fee
- **Note**: Service fee is 3% + RM 1.35 per transaction (shown in TIPS section)

### Section: "Ticket Type" (REQUIRED)

#### Step 2: Add Paid Ticket
- **Heading**: "Ticket Type" (marked as REQUIRED)
- **Description**: "This is where you can set up the different kinds of service packages for your Experience. You can add multiple tickets and customize the rate and quantity for each of them."
- **Action**: Click the "Paid +" button to add a paid ticket
- **Expected Result**: A new ticket row appears in the ticket table/form

#### Step 3: Configure Paid Ticket Details
- **Ticket Type Dropdown**: 
  - Already set to "Paid" (default when clicking "Paid +")
  - Verify "Paid" is selected
- **IMPORTANT: Activate Ticket Form**:
  - After clicking "Paid +", a ticket row appears but form fields may be disabled
  - **Action**: Click on the ticket row or edit/expand button to activate the form fields
  - **Expected Result**: Form fields become enabled and editable
- **Ticket Name Field** (Required):
  - Label: "Ticket Name*"
  - Input field with placeholder "Name of ticket" and character limit (e.g., 40 characters)
  - Character counter shown (e.g., "X / 40")
  - **Action**: Fill in a ticket name (e.g., "Standard Ticket", "VIP Ticket")
  - **Expected Result**: Ticket name entered, character count updated
- **Standard Rate Field** (Required):
  - Label: "Standard Rate*"
  - Input field for price entry with placeholder "00.00"
  - Currency displayed (e.g., "MYR") as prefix
  - **Action**: Enter the ticket price (e.g., "100", "1000")
  - **Expected Result**: Price entered, "Buyer total" calculated and displayed below
- **Ticket Quantity Field** (Required):
  - Label: "Ticket Quantity*"
  - Input field with placeholder "1" and up/down arrows
  - **Action**: Set quantity to "100"
  - **Expected Result**: Quantity set to 100
- **Save Ticket Button**:
  - Button becomes active/clickable once all required fields are filled
  - **Action**: Click "Save Ticket" button (or similar save action)
  - **Expected Result**: Paid ticket is saved and appears in the ticket list

#### Step 4: Add Free Ticket
- **Action**: Click the "Free +" button to add a free ticket
- **Expected Result**: A new ticket row appears with "Free" ticket type selected

#### Step 5: Configure Free Ticket Details
- **Ticket Type Dropdown**: 
  - Already set to "Free" (default when clicking "Free +")
  - Verify "Free" is selected
- **Ticket Name Field** (Required):
  - Label: "Ticket Name*"
  - Input field with character limit
  - **Action**: Fill in a ticket name (e.g., "Free Admission", "Complimentary Ticket")
  - **Expected Result**: Ticket name entered
- **Ticket Quantity Field** (Required):
  - Label: "Ticket Quantity*"
  - Input field with up/down arrows
  - **Action**: Set quantity to "100"
  - **Expected Result**: Quantity set to 100
- **Note**: Free tickets do not have a "Standard Rate" field (not applicable)
- **Save Ticket Button**:
  - Button becomes active/clickable once required fields are filled
  - **Action**: Click "Save Ticket" button
  - **Expected Result**: Free ticket is saved and appears in the ticket list

#### Step 6: Navigate to Next Page
- **Button**: "Continue" button (at bottom right)
- **Action**: Click Continue button
- **Expected**: Navigate to Page step (/onboarding/experience/platform/page)

## Page 5: Your Page (/onboarding/experience/platform/page)

### Section: "Description" (REQUIRED)

#### Step 1: Fill Experience Description (Required)
- **Heading**: "Description" (marked as REQUIRED)
- **Subsection Title**: "Describe your Experience"
- **Guidance Text**: 
  - "Your description is a chance to inspire Learners to take part in your Experience! Here's a breakdown of a good description."
  - Guidelines provided:
    1. "First, briefly describe what you'll do with your Learners and how your Experience is unique."
    2. "Get more specific. How will you kick things off and keep Learners interested?"
    3. "End with a strong selling point. What is the knowledge you want your Learners to leave with, and how can they apply it?"
  - "A concise description of 100-200 words works best!"
- **Input Field**: 
  - Large multi-line textarea
  - Placeholder: "Write a compelling description of your experience..."
  - Character limit: 2000 characters
  - Character counter displayed: "X / 2000 characters"
- **Action**: Fill in the experience description text
- **Expected Result**: Description text entered, character count updated
- **Note**: TIPS section advises "Make sure you have a clearly defined itinerary!"

### Section: "Photos" (REQUIRED)

#### Step 2: Add Cover Photo (Required)
- **Heading**: "Photos" (marked as REQUIRED)
- **Subsection Title**: "Cover Photo"
- **Description**: "This will be the main image displayed on your Experience listing."
- **Upload Area**: 
  - Rectangular upload area with cloud/upload icon
  - Text: "Click to upload"
  - File specifications: "PNG, JPG up to 10MB"
  - Drag-and-drop supported
- **Action**: 
  - Click the upload area or drag-and-drop an image file
  - Select a cover photo from file system
- **Expected Result**: Cover photo uploaded and displayed in the upload area
- **Note**: TIPS section advises "Use high-quality images that represent your experience. Photos of past events or the activity itself work best."

#### Step 3: Add Gallery Photos (Optional)
- **Subsection Title**: "Gallery Photos"
- **Description**: "Add more photos to showcase your Experience. You can add up to 10 photos."
- **Action Button**: "Add photo" button with plus icon
- **Action**: Click "Add photo" button to add additional photos (optional)
- **Expected Result**: Additional photos can be added to gallery (up to 10 total)

### Section: "Video" (OPTIONAL)

#### Step 4: Add Video Link (Optional)
- **Heading**: "Video" (marked as OPTIONAL)
- **Subsection Title**: "Add a video to your Experience"
- **Description**: "Paste a YouTube or Vimeo URL to showcase your experience with video."
- **Input Field**: 
  - Large input field for video URL
  - Placeholder: "https://www.youtube.com/watch?v=..."
  - Accepts YouTube or Vimeo URLs
- **Action**: 
  - Paste the video URL: `https://www.youtube.com/watch?v=SHxwjQUVW4k&t=4s`
  - Or enter any valid YouTube/Vimeo URL
- **Expected Result**: Video URL entered and validated
- **Note**: TIPS section advises "Videos can help participants understand what to expect. Keep it short (1-2 minutes) and engaging."

#### Step 5: Navigate to Next Page
- **Button**: "Continue" button (at bottom right)
- **Action**: Click Continue button
- **Expected**: Navigate to Details page (/onboarding/experience/platform/details)

## Page 6: More Details Page (/onboarding/experience/platform/details)

### Section: "Learning Outcomes" (OPTIONAL)

#### Step 1: Fill Learning Outcomes (Optional)
- **Heading**: "Learning Outcomes" (marked as OPTIONAL)
- **Question**: "What will your Learners be able to take away from your Experience?"
- **Instructions**: "Please outline at least 3 learning outcomes that your Experience will provide. A concise description of 100-200 words is recommended."
- **Input Field**: 
  - Large multi-line textarea
  - Label: "Description"
  - Placeholder text for learning outcomes
- **Action**: Fill in the learning outcomes description (optional)
- **Expected Result**: Learning outcomes text entered
- **Note**: Section can be collapsed/expanded with caret icon

### Section: "Instructions" (OPTIONAL)

#### Step 2: Fill Instructions (Optional)
- **Heading**: "Instructions" (marked as OPTIONAL)
- **Question**: "How should your Learners prepare for the Experience?"
- **Instructions**: "Please provide clear instructions for your Learners. A concise description of 100-200 words is recommended."
- **Input Field**: 
  - Large multi-line textarea
  - Label: "Description"
  - Placeholder text for instructions
- **Action**: Fill in the instructions description (optional)
- **Expected Result**: Instructions text entered
- **Note**: TIPS section provides guidance:
  - For physical Experiences: meeting point, location, transportation directions
  - For online Experiences: video conferencing software, setup guidelines, confirmation email steps

### Section: "Materials" (OPTIONAL)

#### Step 3: Select Materials Option (Optional)
- **Heading**: "Materials" (marked as OPTIONAL)
- **Question**: Likely asks about materials provided for the experience
- **Options**: Radio buttons or dropdown options
- **Action**: Select "No materials provided" option
- **Expected Result**: Materials option selected
- **Note**: Section can be collapsed/expanded with caret icon

### Section: "What to Bring" (OPTIONAL)

#### Step 4: Select What to Bring Option (Optional)
- **Heading**: "What to Bring" (marked as OPTIONAL)
- **Question**: Likely asks what learners need to bring
- **Options**: Radio buttons or dropdown options
- **Action**: Select "This experience does not require anything" option
- **Expected Result**: What to bring option selected
- **Note**: Section can be collapsed/expanded with caret icon

### Section: "Poster" (OPTIONAL)

#### Step 5: Add Poster (Optional)
- **Heading**: "Poster" (marked as OPTIONAL)
- **Description**: "Showcase a poster that relates to your Experience. The poster could consist of your Experience's guidelines, or even promotional material for past and future events."
- **Upload Area**: 
  - Rectangular upload area with cloud/upload icon
  - Text: "Click to upload poster"
  - File specifications: "PNG, JPG up to 10MB"
  - Drag-and-drop supported
- **Action**: 
  - Click the upload area or drag-and-drop a poster image file
  - Select a poster image from file system (optional)
- **Expected Result**: Poster uploaded and displayed in the upload area
- **Note**: TIPS section advises "Your poster may be constrained to fit the frame here in the preview, but it will be displayed according to its original size on your Experience page."

### Section: "Custom Questions" (OPTIONAL)

#### Step 6: Add Custom Questions (Optional)
- **Heading**: "Custom Questions" (marked as OPTIONAL)
- **Description**: "Create a custom form for your Learners. Add custom questions that your Learners will need to answer when booking this Experience. You can add up to 10 questions."
- **Action Button**: "+ Add a question" button
- **Action**: Click "+ Add a question" button to add custom questions (optional)
- **Expected Result**: Custom question form appears for configuration
- **Note**: TIPS section provides guidance:
  - Use short answer for brief responses like names or single words
  - Use paragraph for longer responses requiring detailed answers
  - Use dropdown, multiple choice, or checkboxes for predefined options
  - Mark questions as mandatory if needed

#### Step 7: Navigate to Confirmation Page
- **Button**: "Continue" button (at bottom right)
- **Action**: Click Continue button
- **Expected**: Navigate to Confirmation page (/onboarding/experience/platform/confirm)

## Page 7: Confirmation Page (/onboarding/experience/platform/confirm)

### Overview
This is the final page before publishing the experience. It displays a summary of all sections completed during the experience creation flow.

### Section: Review Summary

#### Step 1: Review All Sections
The confirmation page displays collapsible sections summarizing information from previous steps:

- **Tickets & Pricing**:
  - Service Fee: Shows selected option (e.g., "Learner (pass-through)")
  - Tickets: Lists all tickets with names and quantities
  - Status indicator (green checkmark if complete)
  - "Edit" button available for modifications

- **Experience Page**:
  - Description: Shows status (e.g., "N/a" or actual description)
  - Cover Photo: Shows status (e.g., "Not set" or "Set")
  - Video: Shows status (e.g., "Not set" or video URL)
  - Gallery: Shows number of photos (e.g., "0 photo(s)")
  - Status indicator (yellow exclamation mark if incomplete, green checkmark if complete)
  - "Edit" button available for modifications

- **Details**:
  - Learning Outcomes: Shows status (e.g., "Not set" or actual content)
  - Instructions: Shows status (e.g., "Not set" or actual content)
  - Materials Provided: Shows selected option (e.g., "None")
  - What to Bring: Shows selected option (e.g., "Nothing")
  - Custom Questions: Shows count (e.g., "0 question(s)")
  - Status indicator (green checkmark if complete)
  - "Edit" button available for modifications

#### Step 2: Verify Required Sections
- **Warning Message**: If any required sections are incomplete, a yellow warning banner appears:
  - Message: "Cannot publish yet. Please complete all required sections marked with a yellow indicator before publishing."
  - Required sections with yellow exclamation marks must be completed

#### Step 3: Publish Experience
- **Button**: "Publish" button (at bottom right)
- **Button State**: 
  - Enabled/Active: When all required fields are filled correctly
  - Disabled/Grayed out: When required sections are incomplete
- **Action**: Click "Publish" button (only enabled when all required fields are complete)
- **Expected Result**: 
  - Experience is published successfully
  - User is redirected to experience management page or success page
- **Note**: The "Publish" button will only be clickable when all required sections (marked with yellow indicators) are completed

## Element Selectors (Based on Inspection)

### Title Field
- input[formcontrolname="experienceTitle"]
- Or: 	extbox with placeholder "Name"
- Or: input[placeholder*="Name"]

### Experience Link
- input[formcontrolname*="slug"] or similar
- Or: Input field showing mereka.io/experience/your-experience-name

### Experience Type Cards
- Button with text matching: "Event", "Talk", "Program", "Show & Exhibition", "Workshop"
- Selector: utton or card element with text content

### Add Theme Button
- utton with text "Add Theme +" or "Add Theme"
- Or: utton:has-text("Add Theme")

### Main Theme Category
- Buttons/tags with text: "Art & Design", "Technology", "Business", etc.
- Selector: utton or tag element with matching text

### Topic Selection
- Buttons/tags within the selected theme section
- Selector: utton or tag element with topic text

### Experience Mode Radio Buttons
- input[type="radio"] with labels "Physical", "Virtual", "Hybrid"
- Or: getByRole('radio', { name: /Physical|Virtual|Hybrid/i })

### Location Fields
- Street Address: input[formcontrolname*="street"] or similar
- Country: input[formcontrolname*="country"] or select[formcontrolname*="country"]
- State: input[formcontrolname*="state"] or similar
- City: input[formcontrolname*="city"] or similar

### Host Dropdown
- select with label "Choose team member"
- Or: select[formcontrolname*="host"]
- Options: Team member names from hub

### Continue Button
- utton with text "Continue" or "Next"
- Or: getByRole('button', { name: /Continue|Next/i })

### Page 2: Audience Page Element Selectors

#### Experience Access Radio Buttons
- Everyone: getByRole('radio', { name: /Everyone/i })
- Members: getByRole('radio', { name: /Members/i })
- Hidden Checkbox: checkbox with label "I want my Experience to be hidden"

#### Target Audience Radio Buttons
- Open to Everyone: getByRole('radio', { name: /Open to Everyone/i })
- Specific Groups: getByRole('radio', { name: /Specific Groups/i })

#### Level of Expertise Radio Buttons
- Beginner: getByRole('radio', { name: /Beginner/i })
- Intermediate: getByRole('radio', { name: /Intermediate/i })
- Advanced: getByRole('radio', { name: /Advanced/i })
- Not Applicable: getByRole('radio', { name: /Not Applicable/i })
- Skills Input: input[placeholder*="Type Skills"] or input[formcontrolname*="skill"]

#### Language Dropdowns
- Primary Language: select with label "Choose language" or select[formcontrolname="primaryLanguage"]
- Secondary Language: select with placeholder "Select language" or select[formcontrolname*="secondaryLanguage"]

### Page 3: Booking Details Page Element Selectors

#### Schedule Duration Dropdowns
- Hour(s) Dropdown: select with label "Hour(s)" or select[formcontrolname*="hour"]
- Minute(s) Dropdown: select with label "Minute(s)" or select[formcontrolname*="minute"]
- Options: Hours (0-24), Minutes (00, 05, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55)

#### Timezone Dropdown
- Timezone: select with label "Timezone" or select[formcontrolname*="timezone"]
- Options: Malaysia (GMT+8), Singapore (GMT+8), Indonesia (GMT+7), etc.

#### Add Slot Button
- Add Slot Button: button with text "+ Add Slot" or getByRole('button', { name: /Add Slot/i })

#### Slot Configuration Modal/Form

##### Date Picker
- Date Input: input[placeholder*="dd/mm/yyyy"] or input[formcontrolname*="date"]
- Calendar Icon: button with calendar icon or getByRole('button', { name: /calendar/i })
- Calendar Picker: Calendar component with month/year navigation and date grid

##### Start Time Dropdowns
- Hour Dropdown: select for hour selection (08, 09, 10, etc.)
- Minute Dropdown: select for minute selection (00, 05, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55)
- AM/PM Toggle: button group with "AM" and "PM" options or getByRole('button', { name: /AM|PM/i })

##### Repeat/Occurrence Dropdown
- Repeat Dropdown: select with label "Repeat" or select[formcontrolname*="repeat"]
- Options: Daily, Weekly, Monthly, etc.

##### Save Slot Button
- Save Slot Button: button with text "Save Slot" or getByRole('button', { name: /Save Slot/i })

#### Slot Tabs
- Upcoming Tab: button with text "Upcoming" or getByRole('button', { name: /Upcoming/i })
- Recurring Tab: button with text "Recurring" or getByRole('button', { name: /Recurring/i })
- Past Tab: button with text "Past" or getByRole('button', { name: /Past/i })

### Page 4: Tickets Page Element Selectors

#### Service Fee Radio Buttons
- No, users will bear the service fee: getByRole('radio', { name: /No, users will bear the service fee/i })
- Yes, I will absorb the service fee: getByRole('radio', { name: /Yes, I will absorb the service fee/i })

#### Add Ticket Buttons
- Paid + Button: button with text "Paid +" or getByRole('button', { name: /Paid/i })
- Free + Button: button with text "Free +" or getByRole('button', { name: /Free/i })

#### Ticket Configuration Form/Table

##### Ticket Type Dropdown
- Ticket Type: select with label "Ticket Type*" or select[formcontrolname*="ticketType"]
- Options: "Paid", "Free"

##### Ticket Name Input
- Ticket Name: input with label "Ticket Name*" or input[formcontrolname*="ticketName"]
- Character Counter: text showing "X / 40" or similar
- Max Length: 40 characters

##### Standard Rate Input (Paid Tickets Only)
- Standard Rate: input with label "Standard Rate*" or input[formcontrolname*="standardRate"]
- Currency Display: "MYR" prefix or currency indicator
- Increment/Decrement: buttons with up/down arrows
- Buyer Total Display: text showing "Buyer total: MYR X.XX" (calculated value)

##### Ticket Quantity Input
- Ticket Quantity: input with label "Ticket Quantity*" or input[formcontrolname*="quantity"]
- Increment/Decrement: buttons with up/down arrows

##### Save Ticket Button
- Save Ticket Button: button with text "Save Ticket" or getByRole('button', { name: /Save Ticket/i })
- Note: Button becomes active/clickable when all required fields are filled

##### Action Buttons (Ticket Row)
- Dropdown Menu: button with dropdown icon
- Duplicate/Copy Icon: button with duplicate icon

### Page 5: Your Page Element Selectors

#### Experience Description Textarea
- Description Textarea: textarea with placeholder "Write a compelling description of your experience..." or textarea[formcontrolname*="description"]
- Character Counter: text showing "X / 2000 characters" or similar
- Max Length: 2000 characters

#### Cover Photo Upload
- Cover Photo Upload Area: div or button with text "Click to upload" or input[type="file"] with accept="image/png,image/jpeg"
- File Specifications: Text showing "PNG, JPG up to 10MB"
- Upload Icon: Cloud/upload icon element

#### Gallery Photos
- Add Photo Button: button with text "Add photo" or getByRole('button', { name: /Add photo/i })
- Gallery Photo Upload: input[type="file"] with accept="image/png,image/jpeg" (multiple files allowed)
- Max Photos: Up to 10 photos

#### Video Link Input
- Video URL Input: input with placeholder "https://www.youtube.com/watch?v=..." or input[formcontrolname*="video"]
- Accepts: YouTube URLs (youtube.com/watch?v=...) or Vimeo URLs (vimeo.com/...)
- Example URL: `https://www.youtube.com/watch?v=SHxwjQUVW4k&t=4s`

### Page 6: More Details Page Element Selectors

#### Learning Outcomes Textarea
- Learning Outcomes Textarea: textarea with label "Description" or textarea[formcontrolname*="learningOutcomes"]
- Section Header: heading with text "Learning Outcomes" and "OPTIONAL" badge
- Collapse/Expand Icon: caret icon button

#### Instructions Textarea
- Instructions Textarea: textarea with label "Description" or textarea[formcontrolname*="instructions"]
- Section Header: heading with text "Instructions" and "OPTIONAL" badge
- Collapse/Expand Icon: caret icon button

#### Materials Selection
- Materials Options: radio buttons or select dropdown with options
- No Materials Provided: getByRole('radio', { name: /No materials provided/i }) or select option
- Section Header: heading with text "Materials" and "OPTIONAL" badge

#### What to Bring Selection
- What to Bring Options: radio buttons or select dropdown with options
- No Requirements: getByRole('radio', { name: /This experience does not require anything/i }) or select option
- Section Header: heading with text "What to Bring" and "OPTIONAL" badge

#### Poster Upload
- Poster Upload Area: div or button with text "Click to upload poster" or input[type="file"] with accept="image/png,image/jpeg"
- File Specifications: Text showing "PNG, JPG up to 10MB"
- Upload Icon: Cloud/upload icon element
- Section Header: heading with text "Poster" and "OPTIONAL" badge

#### Custom Questions
- Add Question Button: button with text "+ Add a question" or getByRole('button', { name: /Add a question/i })
- Question Form: Form fields for question type, question text, required toggle
- Max Questions: Up to 10 questions
- Section Header: heading with text "Custom Questions" and "OPTIONAL" badge

### Page 7: Confirmation Page Element Selectors

#### Review Sections
- Tickets & Pricing Section: collapsible section with summary of tickets and service fee
- Experience Page Section: collapsible section with summary of description, cover photo, video, gallery
- Details Section: collapsible section with summary of learning outcomes, instructions, materials, what to bring, custom questions

#### Status Indicators
- Green Checkmark: icon indicating section is complete
- Yellow Exclamation Mark: icon indicating section is incomplete/requires attention

#### Edit Buttons
- Edit Button: button with text "Edit" or getByRole('button', { name: /Edit/i })
- Available for each review section to navigate back and modify

#### Warning Banner
- Warning Message: banner with yellow background and warning icon
- Message Text: "Cannot publish yet. Please complete all required sections marked with a yellow indicator before publishing."

#### Publish Button
- Publish Button: button with text "Publish" or getByRole('button', { name: /Publish/i })
- Enabled State: Active/clickable when all required fields are complete
- Disabled State: Grayed out when required sections are incomplete

## Test Data Requirements

### Required Fields:
- Title: Unique test title (e.g., E2E Test Experience )
- Experience Type: One of (Event, Talk, Program, Show & Exhibition, Workshop)
- Main Theme: One of available categories
- Topic: At least one topic within selected theme
- Experience Mode: Physical, Virtual, or Hybrid
- Location: Required if Physical or Hybrid (verify hub address is filled)
- Host: Optional (can skip or select from dropdown)

### Test Scenarios:
1. **Minimal Required Fields**: Fill only required fields (Title, Category with theme, Mode)
2. **Full Form**: Fill all fields including optional ones
3. **Physical Mode**: Select Physical, verify location fields appear and are filled
4. **Virtual Mode**: Select Virtual (no location required)
5. **Hybrid Mode**: Select Hybrid, verify location fields appear

## Next Steps
- Page 2: Audience page flow (documented)
- Page 3: Booking page flow (documented)
- Page 4: Tickets page flow (documented)
- Page 5: Your Page flow (documented)
- Page 6: More Details page flow (documented)
- Page 7: Confirmation page flow (documented)

**All pages in the Platform Experience Creation Flow have been documented.**
