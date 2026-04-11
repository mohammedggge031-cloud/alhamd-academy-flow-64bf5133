
UPDATE public.regulations SET 
  section_title_en = 'Employment Commitment',
  items_en = '["Part-time work system.", "The teacher must be available for at least 5 hours daily.", "Full commitment to the scheduled session times."]'::jsonb
WHERE id = 'fb17f288-5a5e-4cbf-9b7f-1fd7dd1097cd';

UPDATE public.regulations SET 
  section_title_en = 'Attendance & Discipline',
  items_en = '["The teacher must attend on time without delay, joining the Zoom session at least 1 minute before the scheduled time.\nIn case of an emergency (only for absolute necessity):\n• Notify at least 3 hours before the session.\n• Arrange a suitable alternative time.", "Ensure the student receives their full session time down to the minute.\nIf the student is late:\n• Notify the follow-up group after 5 minutes from the session start.\n• The teacher may leave after 20 minutes if the student does not attend:\n  - The session is recorded as absent.\n  - 15 minutes are credited to the teacher.\n• Time is only credited to the teacher if there is no response from the student.\n• If the student responds:\n  - The session is not counted.\n  - An alternative time is arranged."]'::jsonb
WHERE id = '7b3f1dee-a112-459b-817c-c343d951786a';

UPDATE public.regulations SET 
  section_title_en = 'Session Environment & Quality',
  items_en = '["The teacher must:\n• Turn on the camera during the session.\n• Ensure good lighting.\n• Maintain clear and quality audio.\n• Provide a quiet environment.\n• Maintain a suitable background.\n• Wear appropriate attire at all times.", "Using mobile phones during sessions is prohibited except in cases of necessity."]'::jsonb
WHERE id = '98dd3826-acec-4dee-ac51-b7bba3cbc648';

UPDATE public.regulations SET 
  section_title_en = 'Session Delivery Method',
  items_en = '["Deliver content in an organized, enjoyable, and engaging manner appropriate to the student''s level.", "The teacher should use educational game websites during sessions as appropriate to the student''s level, serving the educational process and achieving session objectives."]'::jsonb
WHERE id = 'c0bd2586-23db-422d-852e-e8c7a5304a78';

UPDATE public.regulations SET 
  section_title_en = 'Communication & Follow-up',
  items_en = '["Personal communication with students by any means is strictly prohibited. All communication must go through supervision.", "The teacher must be:\n• Available.\n• Connected to the internet at all times\nto respond to inquiries when needed."]'::jsonb
WHERE id = 'c67f563b-b3fb-41d4-8dac-85ab2531856d';

UPDATE public.regulations SET 
  section_title_en = 'Reports & Evaluation',
  items_en = '["A report must be sent after each session, written in the student''s spoken language, including:\n• Session date and duration.\n• Topics covered.\n• Student''s level.\n• Assigned homework.", "A comprehensive monthly report must be sent, reflecting:\n• The student''s academic performance.\n• Behavior during sessions (focus – interaction – discipline).", "Reports must be:\n• Written in English.\n• Professionally worded (Native-like).\n• Free of grammatical and spelling errors.\nPreferably the report should be:\n• In Word or PDF format.\n• Include the academy logo."]'::jsonb
WHERE id = '514cf14d-23f9-43f0-af82-9895c08ba398';

UPDATE public.regulations SET 
  section_title_en = 'Trial Session Policy',
  items_en = '["The trial session is counted if:\n• The student continues with the teacher.", "The trial session is NOT counted if:\n• The student does not continue with the teacher."]'::jsonb
WHERE id = 'de8e6193-0fd9-4716-a8c5-4abbe9097b69';

UPDATE public.regulations SET 
  section_title_en = 'General Policies',
  items_en = '["Full compliance with all academy instructions and their precise implementation.", "In case of any problem or observation, management must be notified immediately."]'::jsonb
WHERE id = '3f4b05b1-7e02-4534-9cfa-da43118efecf';
