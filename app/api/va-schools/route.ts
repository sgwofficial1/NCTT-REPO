const api = 'https://api.va.gov/v1/gi/';
const codePattern = /^[A-Z0-9]{8}$/;

async function va(path: string) {
  const response = await fetch(api + path, {
    headers: {Accept:'application/json', 'X-Key-Inflection':'camel'},
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw Error('VA lookup failed');
  return response.json();
}
const amount = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
function identity(a: any) {
  return {code:a.facilityCode, name:a.name, type:a.type, location:[a.city,a.state,a.country].filter(Boolean).join(', ')};
}
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get('code'), name = (params.get('name') || '').trim();
  const page = Number(params.get('page') || 1);
  if (code ? !codePattern.test(code) : name.length < 2 || name.length > 100 || !Number.isSafeInteger(page) || page < 1 || page > 1000)
    return Response.json({error:'Enter a school name or valid VA facility code.'},{status:400});
  try {
    if (!code) {
      const query = new URLSearchParams({name,page:String(page),exclude_vettec:'true'});
      const result = await va('institutions/search?' + query);
      return Response.json({items:result.data.map((row: any) => identity(row.attributes)),
        more:Boolean(result.links?.next), total:result.meta?.count},{headers:{'Cache-Control':'public, max-age=300'}});
    }
    const profile = await va('institutions/'+code);
    const a = profile.data.attributes;
    if (a.facilityCode !== code) throw Error('Unexpected VA record');
    const result = {...identity(a), country:a.country, accreditation:a.accredited, accreditationType:a.accreditationType,
      accreditationStatus:a.accreditationStatus, ribbon:a.yr, ribbons:(a.yellowRibbonPrograms || []).map((x:any)=>({
        level:x.degreeLevel,division:x.divisionProfessionalSchool,amount:x.contributionAmount,places:x.numberOfStudents})),
      programs:a.programTypes || [], credit:a.creditForMilTraining, tuitionIn:amount(a.tuitionInState),
      tuitionOut:amount(a.tuitionOutOfState), warning:a.cautionFlagReason,
      caution:a.cautionFlag,closing:a.schoolClosing,
      version:profile.meta?.version?.createdAt || null};
    return Response.json(result,{headers:{'Cache-Control':'public, max-age=900'}});
  } catch {
    return Response.json({error:'VA school data is unavailable. Try again or use the official comparison tool.'},{status:502});
  }
}
