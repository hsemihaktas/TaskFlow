-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view memberships in their orgs" ON memberships;
DROP POLICY IF EXISTS "Only owners or admins can add members" ON memberships;

-- Create fixed RLS policies for memberships
CREATE POLICY "Users can view their own memberships" ON memberships
    FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can insert themselves as organization owners" ON memberships
    FOR INSERT WITH CHECK (
        user_id = auth.uid()::uuid 
        AND role = 'owner'
        AND NOT EXISTS (
            SELECT 1 FROM memberships m
            WHERE m.organization_id = memberships.organization_id
        )
    );

CREATE POLICY "Owners can add members to their organizations" ON memberships
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM organizations o
            WHERE o.id = memberships.organization_id
            AND o.created_by = auth.uid()::uuid
        )
    );

-- Update organizations policy to be simpler
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
CREATE POLICY "Users can view organizations they created or are members of" ON organizations
    FOR SELECT USING (
        created_by = auth.uid()::uuid
        OR id IN (
            SELECT organization_id FROM memberships 
            WHERE user_id = auth.uid()::uuid
        )
    );