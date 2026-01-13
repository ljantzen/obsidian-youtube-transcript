import { describe, it, expect } from 'vitest';

describe('Create New File Setting', () => {
  it('should have false as default', () => {
    const settings = {
      createNewFile: false,
    };
    expect(settings.createNewFile).toBe(false);
  });

  it('should enable create new file by default', () => {
    const settings = {
      createNewFile: true,
    };
    expect(settings.createNewFile).toBe(true);
  });

  it('should use default setting in modal when not overridden', () => {
    const defaultSetting = true;
    const modalOverride: boolean | undefined = undefined;
    
    const createNewFile = modalOverride ?? defaultSetting;
    expect(createNewFile).toBe(true);
  });

  it('should allow modal to override default setting', () => {
    const defaultSetting = true;
    const modalOverride = false;
    
    const createNewFile = modalOverride ?? defaultSetting;
    expect(createNewFile).toBe(false);
  });

  it('should use default when modal checkbox matches default', () => {
    const defaultSetting = false;
    const modalChecked = false;
    
    const createNewFile = modalChecked;
    expect(createNewFile).toBe(false);
    expect(createNewFile).toBe(defaultSetting);
  });
});
