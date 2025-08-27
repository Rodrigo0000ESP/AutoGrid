"""Add extraction_counters table

Revision ID: 1a2b3c4d5e6f
Revises: 
Create Date: 2025-08-26 16:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '1a2b3c4d5e6f'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Create extraction_counters table
    op.create_table(
        'extraction_counters',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_reset', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    
    # Create index on user_id for faster lookups
    op.create_index(op.f('ix_extraction_counters_user_id'), 'extraction_counters', ['user_id'], unique=False)

def downgrade():
    # Drop the index first
    op.drop_index(op.f('ix_extraction_counters_user_id'), table_name='extraction_counters')
    # Then drop the table
    op.drop_table('extraction_counters')
