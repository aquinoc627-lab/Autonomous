from sqlalchemy import Column, String

from ..core.database import Base


class Tool(Base):
    __tablename__ = "tools"

    id = Column(String, primary_key=True)
    name = Column(String)
    description = Column(String)
    category = Column(String)
    supported_os = Column(String)
