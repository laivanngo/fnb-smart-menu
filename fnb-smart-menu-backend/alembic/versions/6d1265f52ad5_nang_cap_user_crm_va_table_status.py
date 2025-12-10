"""Nang cap User CRM va Table Status

Revision ID: 6d1265f52ad5
Revises: c82c9397c984
Create Date: 2025-12-04 09:24:33.048117

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '6d1265f52ad5'
down_revision: Union[str, Sequence[str], None] = 'c82c9397c984'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Tạo kiểu ENUM mới trong database (nếu chưa có)
    # Dùng execute để đảm bảo type được tạo trước khi alter column
    op.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tablestatus') THEN CREATE TYPE tablestatus AS ENUM ('TRONG', 'CO_KHACH', 'DAT_TRUOC'); END IF; END $$;")

    # 2. Cập nhật cột status với mệnh đề USING để ép kiểu dữ liệu cũ
    # Lưu ý: Dữ liệu cũ nếu không khớp với ENUM sẽ gây lỗi.
    # USING status::text::tablestatus giúp chuyển đổi an toàn hơn nếu dữ liệu cũ là string hợp lệ.
    # Nếu dữ liệu cũ là NULL hoặc string không hợp lệ, cần xử lý thêm (ví dụ: set default).
    # Ở đây giả sử dữ liệu cũ tương thích hoặc bảng đang trống/ít dữ liệu quan trọng.
    op.alter_column('tables', 'status',
               existing_type=sa.VARCHAR(),
               type_=sa.Enum('TRONG', 'CO_KHACH', 'DAT_TRUOC', name='tablestatus'),
               existing_nullable=True,
               postgresql_using="status::text::tablestatus") 

    # [cite_start]Các lệnh add_column khác giữ nguyên [cite: 1]
    op.add_column('users', sa.Column('birthday', sa.Date(), nullable=True))
    op.add_column('users', sa.Column('gender', sa.String(), nullable=True))
    op.add_column('users', sa.Column('last_order_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('total_spent', sa.Numeric(precision=12, scale=0), nullable=True))
    op.add_column('users', sa.Column('order_count', sa.Integer(), nullable=True))
    op.add_column('users', sa.Column('preferences', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('users', sa.Column('internal_note', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Xóa các cột đã thêm
    op.drop_column('users', 'internal_note')
    op.drop_column('users', 'preferences')
    op.drop_column('users', 'order_count')
    op.drop_column('users', 'total_spent')
    op.drop_column('users', 'last_order_date')
    op.drop_column('users', 'gender')
    op.drop_column('users', 'birthday')
    
    # Chuyển đổi ngược lại cột status về VARCHAR
    op.alter_column('tables', 'status',
               existing_type=sa.Enum('TRONG', 'CO_KHACH', 'DAT_TRUOC', name='tablestatus'),
               type_=sa.VARCHAR(),
               existing_nullable=True)
    
    # Xóa kiểu ENUM
    op.execute("DROP TYPE IF EXISTS tablestatus")