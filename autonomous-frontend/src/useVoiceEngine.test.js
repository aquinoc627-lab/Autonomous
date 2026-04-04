import { parseVoiceCommand } from './useVoiceEngine';

describe('parseVoiceCommand', () => {
  it('parses agent status commands', () => {
    expect(parseVoiceCommand('status of Agent 1')).toEqual({ type: 'agent_status', agent: 'agent 1' });
    expect(parseVoiceCommand('  STATUS OF   alpha ')).toEqual({ type: 'agent_status', agent: 'alpha' });
  });

  it('parses assign mission commands', () => {
    expect(parseVoiceCommand('assign mission hack mainframe to cipher')).toEqual({ type: 'assign_mission', mission: 'hack mainframe', agent: 'cipher' });
    expect(parseVoiceCommand('Assign mission Infiltrate Base to Ghost')).toEqual({ type: 'assign_mission', mission: 'infiltrate base', agent: 'ghost' });
  });

  it('parses navigation commands', () => {
    expect(parseVoiceCommand('show missions')).toEqual({ type: 'navigate', page: 'missions' });
    expect(parseVoiceCommand('go to agents')).toEqual({ type: 'navigate', page: 'agents' });
    expect(parseVoiceCommand('SHOW banter')).toEqual({ type: 'navigate', page: 'banter' });
    expect(parseVoiceCommand('go to analytics')).toEqual({ type: 'navigate', page: 'analytics' });
    expect(parseVoiceCommand('show autonomous')).toEqual({ type: 'navigate', page: 'autonomous' });
  });

  it('parses toggle autonomous commands', () => {
    expect(parseVoiceCommand('enable autonomous')).toEqual({ type: 'toggle_autonomous', enabled: true });
    expect(parseVoiceCommand('turn on brain')).toEqual({ type: 'toggle_autonomous', enabled: true });
    expect(parseVoiceCommand('disable autonomous')).toEqual({ type: 'toggle_autonomous', enabled: false });
    expect(parseVoiceCommand('turn off brain')).toEqual({ type: 'toggle_autonomous', enabled: false });
  });

  it('parses clear notifications commands', () => {
    expect(parseVoiceCommand('clear notifications')).toEqual({ type: 'clear_notifications' });
    expect(parseVoiceCommand('Clear Notifications')).toEqual({ type: 'clear_notifications' });
  });

  it('parses help commands', () => {
    expect(parseVoiceCommand('help')).toEqual({ type: 'help' });
    expect(parseVoiceCommand('Help')).toEqual({ type: 'help' });
  });

  it('returns unknown for unrecognized commands', () => {
    expect(parseVoiceCommand('do a barrel roll')).toEqual({ type: 'unknown', transcript: 'do a barrel roll' });
    expect(parseVoiceCommand('')).toEqual({ type: 'unknown', transcript: '' });
  });
});
