from alembic.config import Config
from alembic.script import ScriptDirectory

def test_alembic_heads_and_revisions():
    """Verify that Alembic configuration and migrations can be loaded without error."""
    alembic_cfg = Config("alembic.ini")
    script = ScriptDirectory.from_config(alembic_cfg)
    
    heads = script.get_heads()
    assert len(heads) == 1
    assert heads[0] == "de7dad67ba45"
    
    # Verify the head revision contains the upgrade function
    rev = script.get_revision(heads[0])
    assert rev is not None
    assert rev.doc == "Initial schema"
