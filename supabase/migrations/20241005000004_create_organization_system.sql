-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create memberships table (organization members with roles)
CREATE TABLE IF NOT EXISTS memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, organization_id)
);

-- Create projects table  
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('todo', 'in_progress', 'done')) DEFAULT 'todo',
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view organizations they belong to" ON organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM memberships m
            WHERE m.organization_id = organizations.id
            AND m.user_id = auth.uid()::uuid
        )
    );

CREATE POLICY "Owners can insert organizations" ON organizations
    FOR INSERT WITH CHECK (auth.uid()::uuid = created_by);

-- RLS Policies for memberships
CREATE POLICY "Users can view memberships in their orgs" ON memberships
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM memberships m2
            WHERE m2.organization_id = memberships.organization_id
            AND m2.user_id = auth.uid()::uuid
        )
    );

CREATE POLICY "Only owners or admins can add members" ON memberships
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM memberships mm
            WHERE mm.organization_id = memberships.organization_id
            AND mm.user_id = auth.uid()::uuid
            AND mm.role IN ('owner','admin')
        )
    );

-- RLS Policies for projects
CREATE POLICY "Members can view projects in their org" ON projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM memberships m
            WHERE m.organization_id = projects.organization_id
            AND m.user_id = auth.uid()::uuid
        )
    );

CREATE POLICY "Owners/Admins can insert projects" ON projects
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM memberships m2
            WHERE m2.organization_id = projects.organization_id
            AND m2.user_id = auth.uid()::uuid
            AND m2.role IN ('owner','admin')
        )
    );

-- RLS Policies for tasks
CREATE POLICY "Members can view tasks in their org projects" ON tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1
            FROM projects p
            JOIN memberships m ON m.organization_id = p.organization_id
            WHERE p.id = tasks.project_id
            AND m.user_id = auth.uid()::uuid
        )
    );

CREATE POLICY "Owners/Admins can insert tasks" ON tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM projects p
            JOIN memberships m ON m.organization_id = p.organization_id
            WHERE p.id = tasks.project_id
            AND m.user_id = auth.uid()::uuid
            AND m.role IN ('owner','admin')
        )
    );

CREATE POLICY "Assigned user or creator can update task status" ON tasks
    FOR UPDATE USING (
        auth.uid()::uuid = tasks.assigned_to
        OR auth.uid()::uuid = tasks.created_by
    )
    WITH CHECK (
        auth.uid()::uuid = tasks.assigned_to
        OR auth.uid()::uuid = tasks.created_by
    );