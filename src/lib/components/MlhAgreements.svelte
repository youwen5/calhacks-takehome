<script lang="ts">
  let { values }: { values: Record<string, unknown> } = $props();
  const checked = (key: string) => values[key] === true || values[key] === 'yes';
</script>

<section class="panel">
  <h2>Major League Hacking Authorization</h2>
  <label
    ><input
      type="checkbox"
      name="mlhCodeOfConduct"
      value="yes"
      checked={checked('mlhCodeOfConduct')}
    /><span
      >I have read and agree to the <a
        href="https://mlh.io/code-of-conduct"
        target="_blank"
        rel="noopener noreferrer">MLH Code of Conduct</a
      > (required).</span
    ></label
  >
  <label
    ><input
      type="checkbox"
      name="mlhPrivacyPolicy"
      value="yes"
      checked={checked('mlhPrivacyPolicy')}
    /><span
      >I authorize sharing my application information with Major League Hacking for event
      administration, ranking, and MLH administration in line with the <a
        href="https://mlh.io/privacy"
        target="_blank"
        rel="noopener noreferrer">MLH Privacy Policy</a
      > (required).</span
    ></label
  >
  <label
    ><input
      type="checkbox"
      name="mlhMailingList"
      value="yes"
      checked={checked('mlhMailingList')}
    /><span
      >I authorize MLH to send occasional emails about relevant events, career opportunities, and
      community announcements (optional).</span
    ></label
  >
</section>

<style>
  h2 {
    font-size: 20px;
    margin-bottom: 24px;
  }
  label {
    display: flex;
    gap: 12px;
    align-items: start;
    margin-bottom: 20px;
  }
  input {
    flex-shrink: 0;
    margin-top: 4px;
  }
  label:last-child {
    margin-bottom: 0;
  }
</style>
