-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE todo_category AS ENUM ('normal', 'reminder', 'custom');
CREATE TYPE todo_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Create todos table
CREATE TABLE todos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE DEFAULT CURRENT_DATE,
    due_time TIME,
    category todo_category DEFAULT 'normal',
    severity todo_severity DEFAULT 'medium',
    completed BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    voice_note_url TEXT,
    google_calendar_event_id TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create todo_agents table
CREATE TABLE todo_agents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    prompt_template TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default agents
INSERT INTO todo_agents (category, name, description, prompt_template) VALUES
('normal', 'Basic Task Agent', 'Handles regular todo items without special requirements', 'Process this todo item: {title}. Description: {description}. Set appropriate due date and priority.'),
('reminder', 'Reminder Agent', 'Manages todos with reminder functionality and Google Calendar integration', 'Create a reminder for: {title}. Description: {description}. Due: {due_date} at {due_time}. Set up Google Calendar event and notifications.');

-- Enable Row Level Security
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_agents ENABLE ROW LEVEL SECURITY;

-- Create policies for todos table
CREATE POLICY "Users can view their own todos" ON todos
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own todos" ON todos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own todos" ON todos
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own todos" ON todos
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for todo_agents table (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view todo agents" ON todo_agents
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for todos table
CREATE TRIGGER update_todos_updated_at
    BEFORE UPDATE ON todos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for images and voice notes
INSERT INTO storage.buckets (id, name, public) VALUES
('todo-images', 'todo-images', true),
('voice-notes', 'voice-notes', true);

-- Storage policies
CREATE POLICY "Users can upload their own images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'todo-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own images" ON storage.objects
    FOR SELECT USING (bucket_id = 'todo-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own images" ON storage.objects
    FOR DELETE USING (bucket_id = 'todo-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own voice notes" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own voice notes" ON storage.objects
    FOR SELECT USING (bucket_id = 'voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own voice notes" ON storage.objects
    FOR DELETE USING (bucket_id = 'voice-notes' AND auth.uid()::text = (storage.foldername(name))[1]);