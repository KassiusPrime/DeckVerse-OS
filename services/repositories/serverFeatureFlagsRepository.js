export const serverFeatureFlagsRepository = Object.freeze({
  async isEnabled(supabase, name, environment = 'production') {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('enabled')
      .eq('name', name)
      .eq('environment', environment)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data?.enabled);
  },
});

export default serverFeatureFlagsRepository;
