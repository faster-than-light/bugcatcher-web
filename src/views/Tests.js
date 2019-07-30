import React, { Component } from 'react'
import { Redirect } from 'react-router-dom'

// components
import Menu from '../components/Menu'

// helpers
import { scrollTo } from '../helpers/scrollTo'

// images & styles
import '../assets/css/Tests.css'
import javaLogo from '../assets/images/languages/java.png'
import pythonLogo from '../assets/images/languages/python.png'
import banditLogo from '../assets/images/tools/bandit.png'
import findbugsLogo from '../assets/images/tools/findbugs.png'

export default class Tests extends Component {
  state = {}

  toggleSection(section) {
    const sectionString = `show${section.charAt(0).toUpperCase() + section.slice(1)}Codes`
    let state = this.state
    state[sectionString] = !this.state[sectionString]
    this.setState(state)
  }

  render() {
    const {
      showBanditCodes,
    } = this.state
    return <div className={`theme`}>
      <Menu />
      <section id="tools" className="contents">
        <div className="tools-box">
          <h1>BugCatcher Supported Languages &amp; Tools</h1>
          <br />

          <p>Faster Than Light is built on top of existing open source tools. Our aim is to make these tools easier to use, and ideally to give back to the open source ecosystem with pull requests and other contributions.</p>

          <p>Our aim is to develop capabilities for a range of languages. As of June 2019, we can run tests on Python and Java code. For Python, we run tests using <a href={'https://github.com/PyCQA/bandit'} target={'_blank'}>Bandit</a>. The complete list of Bandit tests can be found on their &quot;<a href={'https://bandit.readthedocs.io/en/latest/plugins/index.html#complete-test-plugin-listing'} target={'_blank'}>Bandit Test Plugins</a>&quot; page. For Java, we use <a href={'http://findbugs.sourceforge.net'} target={'_blank'}>FindBugs</a>.</p>

          <p>The next item on our roadmap is static analysis testing for Android development. (If you have a preferred open source tool for Android, please email us to let us know!)</p>

          <p>BugCatcher Web is optimized for Chrome, and for up to approximately 1000 files at a time. Our lightning fast technology for large code bases will be available in a few weeks, so be sure to sign up for updates!</p>

          <p>Here are the tests that we run on your code:</p>

          <ul className="tests-toc">
            <li style={{ listStyle: 'none', marginLeft: 15 }}>
              <i><small>jump to:</small></i>
            </li>
            <li><button className="link" onClick={() => { scrollTo('java', true, document.getElementById('ftl_navbar').offsetHeight) }}>Java</button></li>
            <li><button className="link" onClick={() => { scrollTo('python', true, document.getElementById('ftl_navbar').offsetHeight) }}>Python</button></li>
          </ul>
        </div>

        <ul>
          <li id="java">
            <img src={javaLogo} alt={'Java'} />
            <div className="hr" />
            <ul>
              <li>
                <h1>
                  <img src={findbugsLogo} alt={'FindBugs'} />
                  <span>FindBugs</span>
                </h1>
              </li>
              <li>FindBugs is an open-source static code analyser created by Bill Pugh and David Hovemeyer which detects possible bugs in Java programs.</li>
              <li>&nbsp;</li>
              <li>The complete list of FindBugs tests can be found on their &quot;<a href={'http://findbugs.sourceforge.net/bugDescriptions.html'} target={'_blank'}>FindBugs Bug Descriptions</a>&quot; page.</li>
            </ul>
          </li>
          <li id="python">
            <img src={pythonLogo} alt={'Python'} />
            <div className="hr" />
            <ul>
              <li>
                <h1>
                  <img src={banditLogo} alt={'Bandit'} />
                  <span>Bandit</span>
                </h1>
              </li>
              <li>Bandit is a tool designed to find common security issues in Python code. To do this Bandit processes each file, builds an AST from it, and runs appropriate plugins against the AST nodes. Once Bandit has finished scanning all the files it generates a report.</li>
              <li>&nbsp;</li>
              <li>
                <button className="link" style={{ display: !showBanditCodes ? 'block' : 'none' }}
                  onClick={() => {this.toggleSection('bandit')}}>show tests</button>
                <ul style={{ display: showBanditCodes ? 'block' : 'none' }}
                  className="left-justify">
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b101_assert_used.html" target="_blank">B101 assert_used</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b102_exec_used.html" target="_blank">B102 exec_used</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b103_set_bad_file_permissions.html" target="_blank">B103 set_bad_file_permissions</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b104_hardcoded_bind_all_interfaces.html" target="_blank">B104 hardcoded_bind_all_interfaces</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b105_hardcoded_password_string.html" target="_blank">B105 hardcoded_password_string</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b106_hardcoded_password_funcarg.html" target="_blank">B106 hardcoded_password_funcarg</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b107_hardcoded_password_funcdef.html" target="_blank">B107 hardcoded_password_default</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b108_hardcoded_tmp_directory.html" target="_blank">B108 hardcoded_tmp_directory</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b109_password_config_option_not_marked_secret.html" target="_blank">B109: Test for a password based config option not marked secret</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b110_try_except_pass.html" target="_blank">B110 try_except_pass</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b111_execute_with_run_as_root_equals_true.html" target="_blank">B111: Test for the use of rootwrap running as root</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b112_try_except_continue.html" target="_blank">B112 try_except_continue</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b201_flask_debug_true.html" target="_blank">B201 flask_debug_true</a>
                  </li>
                  <li>B301 pickle</li>
                  <li>B302 marshal</li>
                  <li>B303 md5</li>
                  <li>B304 ciphers</li>
                  <li>B305 cipher_modes</li>
                  <li>B306 mktemp_q</li>
                  <li>B307 eval</li>
                  <li>B308 mark_safe</li>
                  <li>B309 httpsconnection</li>
                  <li>B310 urllib_urlopen</li>
                  <li>B311 random</li>
                  <li>B312 telnetlib</li>
                  <li>B313 xml_bad_cElementTree</li>
                  <li>B314 xml_bad_ElementTree</li>
                  <li>B315 xml_bad_expatreader</li>
                  <li>B316 xml_bad_expatbuilder</li>
                  <li>B317 xml_bad_sax</li>
                  <li>B318 xml_bad_minidom</li>
                  <li>B319 xml_bad_pulldom</li>
                  <li>B320 xml_bad_etree</li>
                  <li>B321 ftplib</li>
                  <li>B322 input</li>
                  <li>B323 unverified_context</li>
                  <li>B324 hashlib_new_insecure_functions</li>
                  <li>B325 tempnam</li>
                  <li>B401 import_telnetlib</li>
                  <li>B402 import_ftplib</li>
                  <li>B403 import_pickle</li>
                  <li>B404 import_subprocess</li>
                  <li>B405 import_xml_etree</li>
                  <li>B406 import_xml_sax</li>
                  <li>B407 import_xml_expat</li>
                  <li>B408 import_xml_minidom</li>
                  <li>B409 import_xml_pulldom</li>
                  <li>B410 import_lxml</li>
                  <li>B411 import_xmlrpclib</li>
                  <li>B412 import_httpoxy</li>
                  <li>B413 import_pycrypto</li>
                  <li>B414 import_pycryptodome</li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b501_request_with_no_cert_validation.html" target="_blank">B501 request_with_no_cert_validation</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b502_ssl_with_bad_version.html" target="_blank">B502 ssl_with_bad_version</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b503_ssl_with_bad_defaults.html" target="_blank">B503 ssl_with_bad_defaults</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b504_ssl_with_no_version.html" target="_blank">B504 ssl_with_no_version</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b505_weak_cryptographic_key.html" target="_blank">B505 weak_cryptographic_key</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b506_yaml_load.html" target="_blank">B506 yaml_load</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b507_ssh_no_host_key_verification.html" target="_blank">B507 ssh_no_host_key_verification</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b601_paramiko_calls.html" target="_blank">B601 paramiko_calls</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b602_subprocess_popen_with_shell_equals_true.html" target="_blank">B602 subprocess_popen_with_shell_equals_true</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b603_subprocess_without_shell_equals_true.html" target="_blank">B603 subprocess_without_shell_equals_true</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b604_any_other_function_with_shell_equals_true.html" target="_blank">B604 any_other_function_with_shell_equals_true</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b605_start_process_with_a_shell.html" target="_blank">B605 start_process_with_a_shell</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b606_start_process_with_no_shell.html" target="_blank">B606 start_process_with_no_shell</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b607_start_process_with_partial_path.html" target="_blank">B607 start_process_with_partial_path</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b608_hardcoded_sql_expressions.html" target="_blank">B608 hardcoded_sql_expressions</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b609_linux_commands_wildcard_injection.html" target="_blank">B609 linux_commands_wildcard_injection</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b610_django_extra_used.html" target="_blank">B610 django_extra_used</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b611_django_rawsql_used.html" target="_blank">B611 django_rawsql_used</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b701_jinja2_autoescape_false.html" target="_blank">B701 jinja2_autoescape_false</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b702_use_of_mako_templates.html" target="_blank">B702 use_of_mako_templates</a>
                  </li>
                  <li>
                    <a href="https://bandit.readthedocs.io/en/latest/plugins/b703_django_mark_safe.html" target="_blank">B703 django_mark_safe</a>
                  </li>
                  <li>&nbsp;</li>
                </ul>
                <button className="link" style={{ display: showBanditCodes ? 'block' : 'none' }}
                  onClick={() => {this.toggleSection('bandit')}}>hide tests</button>
              </li>
              <li>&nbsp;</li>
              <li>The complete list of Bandit tests can be found on their &quot;<a href={'https://bandit.readthedocs.io/en/latest/plugins/index.html#complete-test-plugin-listing'} target={'_blank'}>Bandit Test Plugins</a>&quot; page.</li>
            </ul>
          </li>
        </ul>
      </section>
    </div>
  }
}
