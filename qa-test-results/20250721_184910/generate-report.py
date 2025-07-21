import os
import json
import glob
from datetime import datetime

def collect_test_results(results_dir):
    results = {
        'timestamp': datetime.now().isoformat(),
        'test_summary': {},
        'browser_tests': {},
        'mobile_tests': {},
        'performance': {},
        'pwa': {}
    }
    
    # 브라우저 테스트 결과 수집
    for browser_dir in glob.glob(f"{results_dir}/*/"):
        browser_name = os.path.basename(browser_dir.rstrip('/'))
        
        if browser_name in ['chrome', 'firefox', 'edge']:
            result_file = os.path.join(browser_dir, 'result.txt')
            if os.path.exists(result_file):
                with open(result_file, 'r') as f:
                    results['browser_tests'][browser_name] = f.read().strip()
            else:
                results['browser_tests'][browser_name] = 'COMPLETED'
        
        elif browser_name.startswith('mobile-'):
            result_file = os.path.join(browser_dir, 'result.txt')
            if os.path.exists(result_file):
                with open(result_file, 'r') as f:
                    results['mobile_tests'][browser_name] = f.read().strip()
    
    # 성능 테스트 결과
    perf_dir = os.path.join(results_dir, 'performance')
    if os.path.exists(perf_dir):
        scores_file = os.path.join(perf_dir, 'scores.txt')
        if os.path.exists(scores_file):
            with open(scores_file, 'r') as f:
                results['performance']['lighthouse'] = f.read().strip()
        
        response_times_file = os.path.join(perf_dir, 'response-times.txt')
        if os.path.exists(response_times_file):
            with open(response_times_file, 'r') as f:
                results['performance']['response_times'] = f.read().strip()
    
    # PWA 테스트 결과
    pwa_dir = os.path.join(results_dir, 'pwa')
    if os.path.exists(pwa_dir):
        for result_file in ['manifest-result.txt', 'sw-result.txt']:
            file_path = os.path.join(pwa_dir, result_file)
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    results['pwa'][result_file.replace('-result.txt', '')] = f.read().strip()
    
    # 요약 정보 생성
    total_tests = len(results['browser_tests']) + len(results['mobile_tests']) + len(results['pwa'])
    passed_tests = sum(1 for result in 
                      list(results['browser_tests'].values()) + 
                      list(results['mobile_tests'].values()) + 
                      list(results['pwa'].values()) 
                      if 'PASS' in result or 'COMPLETED' in result)
    
    results['test_summary'] = {
        'total_tests': total_tests,
        'passed_tests': passed_tests,
        'failed_tests': total_tests - passed_tests,
        'success_rate': f"{(passed_tests / total_tests * 100):.1f}%" if total_tests > 0 else "0%"
    }
    
    return results

if __name__ == "__main__":
    import sys
    results_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    
    results = collect_test_results(results_dir)
    
    # JSON 리포트 저장
    with open(f"{results_dir}/test-report.json", 'w') as f:
        json.dump(results, f, indent=2)
    
    # 텍스트 리포트 생성
    with open(f"{results_dir}/test-report.txt", 'w') as f:
        f.write("TODO-LIST 모바일 환경 QA 테스트 결과\n")
        f.write("=" * 50 + "\n\n")
        
        f.write(f"테스트 실행 시간: {results['timestamp']}\n")
        f.write(f"전체 테스트: {results['test_summary']['total_tests']}\n")
        f.write(f"통과 테스트: {results['test_summary']['passed_tests']}\n")
        f.write(f"실패 테스트: {results['test_summary']['failed_tests']}\n")
        f.write(f"성공률: {results['test_summary']['success_rate']}\n\n")
        
        f.write("브라우저 테스트 결과:\n")
        for browser, result in results['browser_tests'].items():
            f.write(f"  {browser}: {result}\n")
        
        f.write("\n모바일 시뮬레이션 테스트 결과:\n")
        for mobile, result in results['mobile_tests'].items():
            f.write(f"  {mobile}: {result}\n")
        
        f.write("\nPWA 기능 테스트 결과:\n")
        for pwa, result in results['pwa'].items():
            f.write(f"  {pwa}: {result}\n")
        
        if results['performance']:
            f.write("\n성능 테스트 결과:\n")
            for perf_type, result in results['performance'].items():
                f.write(f"  {perf_type}:\n    {result.replace(chr(10), chr(10) + '    ')}\n")
    
    print(f"테스트 리포트가 생성되었습니다: {results_dir}/test-report.txt")
