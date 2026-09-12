<script lang="ts">
  import SearchSelect from './SearchSelect.svelte';
  import {
    schools,
    majors,
    GradYearOptions,
    LevelOfStudyOptions,
    ShirtSizes,
    Genders,
    EthnicityOptions,
    skillLevels,
    dietaryOptions,
  } from '$lib/domain/hacker';
  let { values, disabled }: { values: Record<string, unknown>; disabled: boolean } = $props();
  const text = (key: string) => String(values[key] ?? '');
  const checked = (key: string) => values[key] === true || values[key] === 'yes';
</script>

<section class="panel">
  <h2>Personal Information</h2>
  <p class="muted hint">Not considered for admission.</p>
  <div class="fields two">
    <label
      >Phone Number<input
        name="phoneNumber"
        type="tel"
        value={text('phoneNumber')}
        maxlength="200"
        autocomplete="tel"
        placeholder="(555) 123-4567"
      /></label
    >
    <label
      >Date of Birth<input
        name="dateOfBirth"
        type="date"
        value={text('dateOfBirth')}
        autocomplete="bday"
      /></label
    >
    <SearchSelect
      name="gender"
      label="Gender"
      options={Genders}
      value={text('gender')}
      {disabled}
    />
    <SearchSelect
      name="ethnicity"
      label="Ethnicity"
      options={EthnicityOptions}
      value={text('ethnicity')}
      {disabled}
    />
  </div>
  <fieldset class="choices">
    <legend>T-Shirt Size</legend>
    <div class="row">
      {#each ShirtSizes as size}<label
          ><input
            type="radio"
            name="shirtSize"
            value={size}
            checked={text('shirtSize') === size}
          />{size}</label
        >{/each}
    </div>
  </fieldset>
  <h3>Dietary Restrictions</h3>
  <p class="muted hint">Help us accommodate your dietary needs. All fields are optional.</p>
  <div class="dietary">
    {#each dietaryOptions as option}<label
        ><input
          type="checkbox"
          name={option.key}
          value="yes"
          checked={checked(option.key)}
        />{option.label}</label
      >{/each}
  </div>
  <label
    >Additional Dietary Information<textarea
      name="dietaryAdditionalDetails"
      maxlength="500"
      rows="3"
      placeholder="Specific allergies or additional dietary needs"
      >{text('dietaryAdditionalDetails')}</textarea
    ></label
  >
</section>
<section class="panel">
  <h2>Academic Information</h2>
  <p class="muted hint">
    It’s perfectly OK if you're a complete beginner! We’re looking to represent all skill levels.
  </p>
  <SearchSelect
    name="organization"
    label="University"
    options={schools}
    value={text('organization')}
    placeholder="Search for your university…"
    {disabled}
  />
  <div class="fields two">
    <SearchSelect
      name="levelOfStudy"
      label="Level of Study"
      options={LevelOfStudyOptions}
      value={text('levelOfStudy')}
      {disabled}
    />
    <SearchSelect
      name="gradYear"
      label="Graduation Year"
      options={GradYearOptions.map(String)}
      value={text('gradYear')}
      {disabled}
    />
  </div>
  <SearchSelect
    name="major"
    label="Major"
    options={majors}
    value={text('major')}
    placeholder="Search for your major…"
    {disabled}
  />
  <div class="fields two">
    <fieldset class="choices">
      <legend>Technical Skill Level</legend>{#each skillLevels as level}<label
          ><input
            type="radio"
            name="skillLevel"
            value={level}
            checked={text('skillLevel') === level}
          />{level}</label
        >{/each}
    </fieldset>
    <label
      >Hackathons Attended<input
        name="hackathonsAttended"
        type="number"
        min="0"
        max="9999"
        step="1"
        value={text('hackathonsAttended')}
        placeholder="0"
      /></label
    >
  </div>
</section>
<section class="panel">
  <h2>Address</h2>
  <label
    >Address Line 1<input
      name="addressLine1"
      value={text('addressLine1')}
      maxlength="200"
      autocomplete="address-line1"
      placeholder="123 Main St"
    /></label
  >
  <label
    >Address Line 2 (optional)<input
      name="addressLine2"
      value={text('addressLine2')}
      maxlength="200"
      autocomplete="address-line2"
      placeholder="Apt 4B"
    /></label
  >
  <div class="fields three">
    <label
      >City<input
        name="city"
        value={text('city')}
        maxlength="200"
        autocomplete="address-level2"
        placeholder="Berkeley"
      /></label
    >
    <label
      >State/Province<input
        name="state"
        value={text('state')}
        maxlength="200"
        autocomplete="address-level1"
        placeholder="CA"
      /></label
    >
    <label
      >ZIP / Postal Code<input
        name="zipCode"
        value={text('zipCode')}
        maxlength="200"
        autocomplete="postal-code"
        placeholder="94704"
      /></label
    >
  </div>
  <label
    >Country<input
      name="country"
      value={text('country')}
      maxlength="200"
      autocomplete="country-name"
      placeholder="United States"
    /></label
  >
</section>

<style>
  h2 {
    font-size: 20px;
    margin-bottom: 8px;
  }
  h3 {
    font-size: 18px;
    margin: 24px 0 8px;
  }
  .hint {
    font-size: 14px;
    margin-bottom: 24px;
  }
  .fields {
    display: grid;
    gap: 16px;
    align-items: start;
  }
  .two {
    grid-template-columns: 1fr 1fr;
  }
  .three {
    grid-template-columns: 1fr 1fr 1fr;
  }
  .choices {
    border: 0;
    padding: 0;
    margin: 0 0 24px;
    min-width: 0;
  }
  legend {
    font-weight: 600;
    margin-bottom: 12px;
  }
  .choices label,
  .dietary label {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    text-align: left;
    gap: 8px;
    margin-bottom: 12px;
  }
  .dietary {
    margin-bottom: 24px;
  }
  @media (max-width: 600px) {
    .two,
    .three {
      grid-template-columns: 1fr;
    }
  }
</style>
